import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { MetricsCalculator } from 'src/backtesting/infrastructure/trade-simulation/metrics.calculator';
import { RunBacktestRequestDto } from 'src/backtesting/interfaces/dtos/run-backtest-request.dto';
import {
  LOGGER_TOKEN,
  type ILogger,
} from 'src/core/interfaces/logger.interface';
import {
  MARKET_DATA_REPOSITORY_TOKEN,
  type IMarketDataRepository,
} from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import {
  STRATEGY_EVALUATOR_TOKEN,
  type IStrategyEvaluator,
} from 'src/backtesting/domain/interfaces/strategy-evaluator.interface';
import {
  TRADE_SIMULATOR_TOKEN,
  type ITradeSimulator,
} from 'src/backtesting/domain/interfaces/trade-simulator.interface';
import { RiskModel } from 'src/backtesting/domain/value-objects/risk-model.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';

@Injectable()
export class RunBacktestUseCase {
  private static readonly LOG_CONTEXT = 'RunBacktestUseCase';
  private static readonly DEFAULT_PROGRESS_LOG_EVERY = 10_000;
  private static readonly CANCEL_CHECK_EVERY = 500;
  private static readonly SIGNALS_BATCH_SIZE = 1_000;
  private static readonly EQUITY_BATCH_SIZE = 1_000;
  private readonly progressLogEvery: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
    @Inject(STRATEGY_EVALUATOR_TOKEN)
    private readonly strategyEvaluator: IStrategyEvaluator,
    @Inject(TRADE_SIMULATOR_TOKEN)
    private readonly tradeSimulator: ITradeSimulator,
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {
    const configured = Number(
      this.configService.get<string>('BACKTEST_PROGRESS_LOG_EVERY') ??
        String(RunBacktestUseCase.DEFAULT_PROGRESS_LOG_EVERY),
    );
    this.progressLogEvery =
      Number.isFinite(configured) && configured > 0
        ? Math.floor(configured)
        : RunBacktestUseCase.DEFAULT_PROGRESS_LOG_EVERY;
  }

  public async execute(command: RunBacktestRequestDto) {
    const fromInterval = Timeframe.from(command.fromInterval ?? '1m');
    const toInterval = Timeframe.from(command.toInterval ?? '15m');
    const start = Timestamp.fromMs(new Date(command.startDate).getTime());
    const end = Timestamp.fromMs(new Date(command.endDate).getTime());

    if (start.isAfter(end)) {
      throw new Error('startDate must be before or equal to endDate');
    }

    this.strategyEvaluator.reset();
    this.tradeSimulator.reset();

    const riskModel = RiskModel.from(
      command.riskPercent ?? 2,
      command.rewardRatio ?? 2,
    );
    const initialBalance = command.initialBalance ?? 10_000;
    const signalsBuffer: Array<{
      timestampMs: bigint;
      signalType: 'BUY' | 'SELL' | 'INVALID';
      reason: string;
      price: string;
      metadata?: Record<string, unknown>;
    }> = [];

    let processedCandles = 0;
    let generatedSignals = 0;
    let wasCancelled = false;
    let lastCandle: Parameters<IStrategyEvaluator['evaluate']>[0] | null = null;
    const useSameTimeframeContext = fromInterval.equals(toInterval);
    let higherTimeframeIterator: AsyncIterator<
      Candle,
      unknown,
      undefined
    > | null = null;
    let activeHigherTimeframeCandle: Candle | null = null;

    if (!useSameTimeframeContext) {
      higherTimeframeIterator = this.marketDataRepository
        .getAggregatedStream(
          command.symbol,
          fromInterval,
          toInterval,
          start,
          end,
        )
        [Symbol.asyncIterator]();
      const higherTimeframeStep = await higherTimeframeIterator.next();
      activeHigherTimeframeCandle = higherTimeframeStep.done
        ? null
        : higherTimeframeStep.value;
    }

    this.logger.log(
      `Starting backtest symbol=${command.symbol} from=${fromInterval.toString()} to=${toInterval.toString()} startMs=${start.toMs().toString()} endMs=${end.toMs().toString()}`,
      RunBacktestUseCase.LOG_CONTEXT,
    );

    const runId = await this.backtestRunRepository.startRun({
      symbol: command.symbol,
      interval: toInterval.toString(),
      strategyVersion: 'fvg-bos-v1',
      config: {
        fromInterval: fromInterval.toString(),
        toInterval: toInterval.toString(),
        initialBalance,
        riskPercent: command.riskPercent ?? 2,
        rewardRatio: command.rewardRatio ?? 2,
      },
      startTimeMs: start.toMs(),
      endTimeMs: end.toMs(),
    });
    try {
      for await (const candle of this.marketDataRepository.getCandleStream(
        command.symbol,
        fromInterval.toString(),
        start,
        end,
      )) {
        processedCandles += 1;
        lastCandle = candle;

        if (
          processedCandles % RunBacktestUseCase.CANCEL_CHECK_EVERY === 0 &&
          (await this.backtestRunRepository.isRunCancelled(runId))
        ) {
          wasCancelled = true;
          break;
        }

        if (processedCandles % this.progressLogEvery === 0) {
          await this.backtestRunRepository.updateRunProgress(
            runId,
            processedCandles,
            generatedSignals,
          );
          this.logger.log(
            `Progress processedCandles=${processedCandles} generatedSignals=${generatedSignals}`,
            RunBacktestUseCase.LOG_CONTEXT,
          );
        }

        while (
          !useSameTimeframeContext &&
          higherTimeframeIterator &&
          activeHigherTimeframeCandle &&
          candle
            .getOpenTime()
            .isAfter(activeHigherTimeframeCandle.getCloseTime())
        ) {
          const higherTimeframeStep = await higherTimeframeIterator.next();
          activeHigherTimeframeCandle = higherTimeframeStep.done
            ? null
            : higherTimeframeStep.value;
        }

        const higherCandleContext = useSameTimeframeContext
          ? candle
          : this.inRange(candle, activeHigherTimeframeCandle)
            ? activeHigherTimeframeCandle
            : null;

        this.tradeSimulator.closeOpenTrade(candle, 'risk_check');

        const signals = this.strategyEvaluator.evaluate(
          candle,
          higherCandleContext,
        );
        generatedSignals += signals.length;

        for (const signal of signals) {
          signalsBuffer.push({
            timestampMs: signal.getTime().toMs(),
            signalType: signal.getType(),
            reason: signal.getReason(),
            price: signal.getPrice().toString(),
            metadata: signal.getMetadata(),
          });
          if (signalsBuffer.length >= RunBacktestUseCase.SIGNALS_BATCH_SIZE) {
            await this.backtestRunRepository.appendSignals(
              runId,
              signalsBuffer,
            );
            signalsBuffer.length = 0;
          }

          const existing = this.tradeSimulator.getOpenTrade();
          if (existing && signal.getType() !== 'INVALID') {
            this.tradeSimulator.closeOpenTrade(candle, 'new_signal');
          }
          this.tradeSimulator.processSignal(signal, riskModel);
        }
      }

      if (lastCandle && this.tradeSimulator.getOpenTrade()) {
        this.tradeSimulator.closeOpenTrade(lastCandle, 'end_of_backtest');
      }

      if (signalsBuffer.length > 0) {
        await this.backtestRunRepository.appendSignals(runId, signalsBuffer);
      }

      const closedTrades = this.tradeSimulator.getClosedTrades();
      const metrics = MetricsCalculator.calculateMetrics(
        closedTrades,
        initialBalance,
      );
      const equityPoints = this.buildEquityPoints(
        closedTrades,
        initialBalance,
        start,
      );
      for (
        let i = 0;
        i < equityPoints.length;
        i += RunBacktestUseCase.EQUITY_BATCH_SIZE
      ) {
        await this.backtestRunRepository.appendEquityPoints(
          runId,
          equityPoints.slice(i, i + RunBacktestUseCase.EQUITY_BATCH_SIZE),
        );
      }

      if (
        wasCancelled ||
        (await this.backtestRunRepository.isRunCancelled(runId))
      ) {
        await this.backtestRunRepository.updateRunProgress(
          runId,
          processedCandles,
          generatedSignals,
        );
        await this.backtestRunRepository.cancelRun(runId);
        this.logger.warn(
          `Cancelled backtest runId=${runId} processedCandles=${processedCandles} generatedSignals=${generatedSignals}`,
          RunBacktestUseCase.LOG_CONTEXT,
        );
        return {
          runId,
          symbol: command.symbol,
          fromInterval: fromInterval.toString(),
          toInterval: toInterval.toString(),
          processedCandles,
          generatedSignals,
          status: 'cancelled' as const,
          metrics,
        };
      }

      await this.backtestRunRepository.finalizeRun({
        runId,
        processedCandles,
        generatedSignals,
        metrics: {
          totalTrades: metrics.totalTrades,
          winningTrades: metrics.winningTrades,
          losingTrades: metrics.losingTrades,
          winRate: metrics.winRate,
          totalPnL: metrics.totalPnL,
          maxDrawdown: metrics.maxDrawdown,
          sharpeRatio: metrics.sharpeRatio,
          profitFactor: metrics.profitFactor,
          avgWin: metrics.avgWin,
          avgLoss: metrics.avgLoss,
        },
        trades: closedTrades,
      });

      this.logger.log(
        `Completed backtest runId=${runId} processedCandles=${processedCandles} generatedSignals=${generatedSignals} closedTrades=${closedTrades.length}`,
        RunBacktestUseCase.LOG_CONTEXT,
      );

      return {
        runId,
        symbol: command.symbol,
        fromInterval: fromInterval.toString(),
        toInterval: toInterval.toString(),
        processedCandles,
        generatedSignals,
        status: 'completed' as const,
        metrics,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.backtestRunRepository.failRun(runId, message);
      this.logger.error(
        `Backtest failed runId=${runId} reason=${message}`,
        undefined,
        RunBacktestUseCase.LOG_CONTEXT,
      );
      throw error;
    }
  }

  private buildEquityPoints(
    closedTrades: ReturnType<ITradeSimulator['getClosedTrades']>,
    initialBalance: number,
    start: Timestamp,
  ): Array<{
    timestampMs: bigint;
    equity: string;
    drawdown: string;
  }> {
    const points: Array<{
      timestampMs: bigint;
      equity: string;
      drawdown: string;
    }> = [];

    let equity = new Decimal(initialBalance);
    let peakEquity = equity;

    points.push({
      timestampMs: start.toMs(),
      equity: equity.toString(),
      drawdown: '0',
    });

    const sortedTrades = [...closedTrades].sort((a, b) => {
      const aTime = (a.getExitTime() ?? a.getEntryTime()).toMs();
      const bTime = (b.getExitTime() ?? b.getEntryTime()).toMs();
      if (aTime < bTime) {
        return -1;
      }
      if (aTime > bTime) {
        return 1;
      }
      return 0;
    });

    for (const trade of sortedTrades) {
      equity = equity.plus(trade.getPnL() ?? 0);
      if (equity.greaterThan(peakEquity)) {
        peakEquity = equity;
      }
      const drawdown = peakEquity.minus(equity);
      points.push({
        timestampMs: (trade.getExitTime() ?? trade.getEntryTime()).toMs(),
        equity: equity.toString(),
        drawdown: drawdown.toString(),
      });
    }

    return points;
  }

  private inRange(
    lowerCandle: Candle,
    higherCandle: Candle | null,
  ): higherCandle is Candle {
    if (!higherCandle) {
      return false;
    }
    return (
      lowerCandle.getOpenTime().isAfterOrEqual(higherCandle.getOpenTime()) &&
      lowerCandle.getOpenTime().isBeforeOrEqual(higherCandle.getCloseTime())
    );
  }
}
