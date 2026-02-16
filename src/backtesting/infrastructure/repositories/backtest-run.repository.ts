import { Injectable } from '@nestjs/common';
import {
  IBacktestRunRepository,
  SaveBacktestRunInput,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import { BacktestRunMapper } from '../mappers/backtest-run.mapper';

@Injectable()
export class BacktestRunRepository implements IBacktestRunRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly backtestRunMapper: BacktestRunMapper,
  ) {}

  public async saveRun(input: SaveBacktestRunInput): Promise<string> {
    const run = await this.prisma.backtestRun.create({
      data: {
        ...this.backtestRunMapper.toPersistenceRun(input),
        trades: {
          create: this.backtestRunMapper.toPersistenceTrades(input),
        },
      },
      select: { id: true },
    });

    return run.id;
  }
}
