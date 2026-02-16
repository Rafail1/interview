import Decimal from 'decimal.js';
import { Trade } from 'src/backtesting/domain/entities/trade.entity';

type ClosedTradeStats = {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  drawTrades: number;
  winRate: string;
  totalPnL: string;
  roi: string;
  avgWin: string;
  avgLoss: string;
  profitFactor: string;
  maxDrawdown: string;
  drawdownPercent: string;
  expectancy: string;
  sharpeRatio: string;
};

export class MetricsCalculator {
  public static calculateMetrics(
    trades: Trade[],
    initialBalance: Decimal | number,
    riskFreeRate = 0.02,
  ): ClosedTradeStats {
    const balance =
      typeof initialBalance === 'number'
        ? new Decimal(initialBalance)
        : initialBalance;

    const closedPnls = trades
      .map((trade) => trade.getPnL())
      .filter((pnl): pnl is Decimal => pnl !== null);

    const totalTrades = closedPnls.length;
    const winning = closedPnls.filter((pnl) => pnl.greaterThan(0));
    const losing = closedPnls.filter((pnl) => pnl.lessThan(0));
    const draw = closedPnls.filter((pnl) => pnl.equals(0));

    const totalPnL = closedPnls.reduce(
      (sum, pnl) => sum.plus(pnl),
      new Decimal(0),
    );
    const roi = balance.isZero()
      ? new Decimal(0)
      : totalPnL.dividedBy(balance).times(100);
    const winRate =
      totalTrades === 0
        ? new Decimal(0)
        : new Decimal(winning.length).dividedBy(totalTrades).times(100);
    const avgWin =
      winning.length === 0
        ? new Decimal(0)
        : winning
            .reduce((sum, pnl) => sum.plus(pnl), new Decimal(0))
            .dividedBy(winning.length);
    const avgLoss =
      losing.length === 0
        ? new Decimal(0)
        : losing
            .reduce((sum, pnl) => sum.plus(pnl), new Decimal(0))
            .dividedBy(losing.length);

    const grossWins = winning.reduce(
      (sum, pnl) => sum.plus(pnl),
      new Decimal(0),
    );
    const grossLosses = losing.reduce(
      (sum, pnl) => sum.plus(pnl.abs()),
      new Decimal(0),
    );
    const profitFactor = grossLosses.isZero()
      ? new Decimal(0)
      : grossWins.dividedBy(grossLosses);

    const { maxDrawdown, drawdownPercent } = this.calculateMaxDrawdown(
      closedPnls,
      balance,
    );
    const expectancy =
      totalTrades === 0 ? new Decimal(0) : totalPnL.dividedBy(totalTrades);
    const sharpeRatio = this.calculateSharpeRatio(closedPnls, riskFreeRate);

    return {
      totalTrades,
      winningTrades: winning.length,
      losingTrades: losing.length,
      drawTrades: draw.length,
      winRate: winRate.toFixed(2),
      totalPnL: totalPnL.toFixed(2),
      roi: roi.toFixed(2),
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      profitFactor: profitFactor.toFixed(2),
      maxDrawdown: maxDrawdown.toFixed(2),
      drawdownPercent: drawdownPercent.toFixed(2),
      expectancy: expectancy.toFixed(2),
      sharpeRatio: sharpeRatio.toFixed(2),
    };
  }

  public static generateEquityCurve(
    trades: Trade[],
    initialBalance: Decimal | number,
  ): Array<{ tradeIndex: number; balance: Decimal }> {
    const start =
      typeof initialBalance === 'number'
        ? new Decimal(initialBalance)
        : initialBalance;

    const curve: Array<{ tradeIndex: number; balance: Decimal }> = [
      { tradeIndex: 0, balance: start },
    ];

    let running = start;
    for (let i = 0; i < trades.length; i++) {
      const pnl = trades[i].getPnL();
      if (pnl) {
        running = running.plus(pnl);
      }
      curve.push({ tradeIndex: i + 1, balance: running });
    }
    return curve;
  }

  private static calculateMaxDrawdown(
    pnls: Decimal[],
    initialBalance: Decimal,
  ): { maxDrawdown: Decimal; drawdownPercent: Decimal } {
    let peak = initialBalance;
    let maxDrawdown = new Decimal(0);
    let maxDrawdownPercent = new Decimal(0);
    let running = initialBalance;

    for (const pnl of pnls) {
      running = running.plus(pnl);
      if (running.greaterThan(peak)) {
        peak = running;
      }
      const drawdown = peak.minus(running);
      const drawdownPct = peak.isZero()
        ? new Decimal(0)
        : drawdown.dividedBy(peak).times(100);
      if (drawdown.greaterThan(maxDrawdown)) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPct;
      }
    }

    return { maxDrawdown, drawdownPercent: maxDrawdownPercent };
  }

  private static calculateSharpeRatio(
    pnls: Decimal[],
    riskFreeRate: number,
  ): Decimal {
    if (pnls.length < 2) {
      return new Decimal(0);
    }

    const mean = pnls
      .reduce((sum, pnl) => sum.plus(pnl), new Decimal(0))
      .dividedBy(pnls.length);
    const variance = pnls
      .reduce((sum, pnl) => {
        const diff = pnl.minus(mean);
        return sum.plus(diff.times(diff));
      }, new Decimal(0))
      .dividedBy(pnls.length);
    const stdDev = variance.sqrt();

    if (stdDev.isZero()) {
      return new Decimal(0);
    }

    const dailyRiskFree = new Decimal(riskFreeRate).dividedBy(252);
    return mean.minus(dailyRiskFree).dividedBy(stdDev);
  }
}
