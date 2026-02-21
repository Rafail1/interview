import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Price } from 'src/backtesting/domain/value-objects';
import { Signal } from 'src/backtesting/domain/entities/signal.entity';
import { Trade } from 'src/backtesting/domain/entities/trade.entity';
import { ITradeSimulator } from 'src/backtesting/domain/interfaces/trade-simulator.interface';
import { RiskModel } from 'src/backtesting/domain/value-objects/risk-model.value-object';

type FvgMetadata = {
  upperBound?: unknown;
  lowerBound?: unknown;
};

@Injectable()
export class TradeSimulator implements ITradeSimulator {
  private static readonly DEFAULT_INITIAL_BALANCE = new Decimal(10_000);
  private openTrade: Trade | null = null;
  private closedTrades: Trade[] = [];
  private readonly startingBalance: Decimal =
    TradeSimulator.DEFAULT_INITIAL_BALANCE;
  private accountBalance: Decimal = TradeSimulator.DEFAULT_INITIAL_BALANCE;

  public processSignal(signal: Signal, riskModel: RiskModel): Trade | null {
    const type = signal.getType();
    if (type === 'INVALID') {
      return null;
    }

    if (this.openTrade && !this.openTrade.isClosed()) {
      return null;
    }

    const entryPrice = signal.getPrice().toDecimal();
    if (entryPrice.isZero()) {
      return null;
    }

    const riskAmount = this.accountBalance
      .times(riskModel.getRiskPercent())
      .dividedBy(100);
    const tradeSide = type === 'BUY' ? 'BUY' : 'SELL';
    const stopLoss = this.resolveStopLossFromFvgOrRiskPercent(
      signal,
      tradeSide,
      entryPrice,
      riskModel,
    );
    if (!stopLoss) {
      return null;
    }

    const stopDistance =
      tradeSide === 'BUY'
        ? entryPrice.minus(stopLoss.toDecimal())
        : stopLoss.toDecimal().minus(entryPrice);
    if (stopDistance.lessThanOrEqualTo(0)) {
      return null;
    }
    const quantity = riskAmount.dividedBy(stopDistance);
    const takeDistance = stopDistance.times(riskModel.getRewardRatio());
    const takeProfit =
      tradeSide === 'BUY'
        ? entryPrice.plus(takeDistance)
        : entryPrice.minus(takeDistance);

    if (takeProfit.lessThanOrEqualTo(0)) {
      return null;
    }

    this.openTrade = Trade.create(
      `trade-${signal.getTime().toMsNumber()}`,
      signal.getTime(),
      signal.getPrice(),
      quantity,
      tradeSide,
      stopLoss,
      Price.from(takeProfit.toString()),
    );

    return this.openTrade;
  }

  public closeOpenTrade(candle: Candle, reason: string): Trade | null {
    if (!this.openTrade || this.openTrade.isClosed()) {
      return null;
    }

    if (reason === 'risk_check') {
      const exitPrice = this.resolveRiskExitPrice(this.openTrade, candle);
      if (!exitPrice) {
        this.applyBreakEvenStopWhenOneToOneReached(this.openTrade, candle);
        return null;
      }
      this.openTrade.close(candle.getCloseTime(), exitPrice);
    } else {
      this.openTrade.close(candle.getCloseTime(), candle.getClose());
    }

    const pnl = this.openTrade.getPnL();
    if (pnl) {
      this.accountBalance = this.accountBalance.plus(pnl);
    }

    const closed = this.openTrade;
    this.closedTrades.push(closed);
    this.openTrade = null;
    return closed;
  }

  public getOpenTrade(): Trade | null {
    return this.openTrade;
  }

  public getClosedTrades(): Trade[] {
    return [...this.closedTrades];
  }

  public reset(): void {
    this.openTrade = null;
    this.closedTrades = [];
    this.accountBalance = this.startingBalance;
  }

  private resolveRiskExitPrice(trade: Trade, candle: Candle): Price | null {
    const stopLoss = trade.getStopLossPrice();
    const takeProfit = trade.getTakeProfitPrice();

    if (!stopLoss || !takeProfit) {
      return null;
    }

    const hitStop =
      candle.getLow().isLessThanOrEqual(stopLoss) &&
      candle.getHigh().isGreaterThanOrEqual(stopLoss);
    const hitTake =
      candle.getLow().isLessThanOrEqual(takeProfit) &&
      candle.getHigh().isGreaterThanOrEqual(takeProfit);

    if (trade.getSide() === 'BUY') {
      if (hitStop) {
        return stopLoss;
      }
      if (hitTake) {
        return takeProfit;
      }
      return null;
    }

    if (hitStop) {
      return stopLoss;
    }
    if (hitTake) {
      return takeProfit;
    }
    return null;
  }

  private applyBreakEvenStopWhenOneToOneReached(
    trade: Trade,
    candle: Candle,
  ): void {
    const currentStop = trade.getStopLossPrice();
    const initialStop = trade.getInitialStopLossPrice();
    const entry = trade.getEntryPrice();

    if (!currentStop || !initialStop) {
      return;
    }

    if (trade.getSide() === 'BUY') {
      const riskDistance = entry.toDecimal().minus(initialStop.toDecimal());
      if (riskDistance.lessThanOrEqualTo(0)) {
        return;
      }
      const oneToOneTarget = entry.toDecimal().plus(riskDistance);
      const reachedOneToOne = candle
        .getHigh()
        .toDecimal()
        .greaterThanOrEqualTo(oneToOneTarget);
      const stopBelowEntry = currentStop.toDecimal().lessThan(entry.toDecimal());

      if (reachedOneToOne && stopBelowEntry) {
        trade.moveStopLossToEntry();
      }
      return;
    }

    const riskDistance = initialStop.toDecimal().minus(entry.toDecimal());
    if (riskDistance.lessThanOrEqualTo(0)) {
      return;
    }
    const oneToOneTarget = entry.toDecimal().minus(riskDistance);
    const reachedOneToOne = candle
      .getLow()
      .toDecimal()
      .lessThanOrEqualTo(oneToOneTarget);
    const stopAboveEntry = currentStop.toDecimal().greaterThan(entry.toDecimal());

    if (reachedOneToOne && stopAboveEntry) {
      trade.moveStopLossToEntry();
    }
  }

  private resolveStopLossFromFvgOrRiskPercent(
    signal: Signal,
    side: 'BUY' | 'SELL',
    entryPrice: Decimal,
    riskModel: RiskModel,
  ): Price | null {
    const fvgStop = this.getFvgStopPrice(signal, side);
    if (fvgStop) {
      const structureStopDecimal = fvgStop.toDecimal();
      const validForSide =
        side === 'BUY'
          ? structureStopDecimal.lessThan(entryPrice)
          : structureStopDecimal.greaterThan(entryPrice);
      if (validForSide && structureStopDecimal.greaterThan(0)) {
        return fvgStop;
      }
    }

    const fallbackStopDistance = entryPrice
      .times(riskModel.getRiskPercent())
      .dividedBy(100);
    if (fallbackStopDistance.lessThanOrEqualTo(0)) {
      return null;
    }

    const fallbackStop =
      side === 'BUY'
        ? entryPrice.minus(fallbackStopDistance)
        : entryPrice.plus(fallbackStopDistance);
    if (fallbackStop.lessThanOrEqualTo(0)) {
      return null;
    }
    return Price.from(fallbackStop.toString());
  }

  private getFvgStopPrice(
    signal: Signal,
    side: 'BUY' | 'SELL',
  ): Price | null {
    const metadata = signal.getMetadata();
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const fvg = (metadata as Record<string, unknown>).fvg as
      | FvgMetadata
      | undefined;
    if (!fvg || typeof fvg !== 'object') {
      return null;
    }

    const rawValue = side === 'BUY' ? fvg.lowerBound : fvg.upperBound;
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
      return null;
    }

    try {
      return Price.from(rawValue);
    } catch {
      return null;
    }
  }
}
