import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Price } from 'src/backtesting/domain/value-objects';
import { Signal } from 'src/backtesting/domain/entities/signal.entity';
import { Trade } from 'src/backtesting/domain/entities/trade.entity';
import { ITradeSimulator } from 'src/backtesting/domain/interfaces/trade-simulator.interface';
import { RiskModel } from 'src/backtesting/domain/value-objects/risk-model.value-object';

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
    const quantity = riskAmount.dividedBy(entryPrice);
    const tradeSide = type === 'BUY' ? 'BUY' : 'SELL';
    const stopDistance = entryPrice
      .times(riskModel.getRiskPercent())
      .dividedBy(100);
    const takeDistance = stopDistance.times(riskModel.getRewardRatio());
    const stopLoss =
      tradeSide === 'BUY'
        ? entryPrice.minus(stopDistance)
        : entryPrice.plus(stopDistance);
    const takeProfit =
      tradeSide === 'BUY'
        ? entryPrice.plus(takeDistance)
        : entryPrice.minus(takeDistance);

    if (stopLoss.lessThanOrEqualTo(0) || takeProfit.lessThanOrEqualTo(0)) {
      return null;
    }

    this.openTrade = Trade.create(
      `trade-${signal.getTime().toMsNumber()}`,
      signal.getTime(),
      signal.getPrice(),
      quantity,
      tradeSide,
      Price.from(stopLoss.toString()),
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
}
