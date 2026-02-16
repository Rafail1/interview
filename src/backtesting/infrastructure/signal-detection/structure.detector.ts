import { Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { StructureState } from 'src/backtesting/domain/entities/structure-state.entity';
import { IStructureDetector } from 'src/backtesting/domain/interfaces/structure-detector.interface';

@Injectable()
export class StructureDetector implements IStructureDetector {
  private readonly history: Candle[] = [];
  private currentState: StructureState | null = null;

  public detect(candle: Candle): StructureState | null {
    this.history.push(candle);

    if (!this.currentState) {
      this.currentState = StructureState.create(
        'structure-initial',
        candle.getClose(),
        candle.getCloseTime(),
      );
      return null;
    }

    const time = candle.getCloseTime();
    const bullishBos = this.currentState.checkBullishBos(
      candle.getHigh(),
      time,
    );
    const bearishBos = this.currentState.checkBearishBos(candle.getLow(), time);

    this.currentState.updateStructure(candle.getClose(), time);
    return bullishBos || bearishBos ? this.currentState : null;
  }

  public getCurrentState(): StructureState | null {
    return this.currentState;
  }

  public reset(): void {
    this.history.length = 0;
    this.currentState = null;
  }
}
