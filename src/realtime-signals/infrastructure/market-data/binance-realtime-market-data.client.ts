import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import {
  Timeframe,
  type TimeframeValue,
} from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { IRealtimeMarketDataClient } from 'src/realtime-signals/domain/interfaces/realtime-market-data-client.interface';

type BinanceKlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

@Injectable()
export class BinanceRealtimeMarketDataClient implements IRealtimeMarketDataClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://fapi.binance.com',
      timeout: 20_000,
    });
  }

  public async getRecentCandles(
    symbol: string,
    timeframe: TimeframeValue,
    limit: number,
  ): Promise<Candle[]> {
    const sanitizedLimit = Math.max(1, Math.min(1500, Math.floor(limit)));
    const response = await this.http.get<BinanceKlineRow[]>('/fapi/v1/klines', {
      params: {
        symbol,
        interval: timeframe,
        limit: sanitizedLimit,
      },
    });

    const tf = Timeframe.from(timeframe);
    return response.data
      .map((row) =>
        Candle.create(
          symbol,
          tf,
          row[0],
          row[6],
          OHLCV.from(row[1], row[2], row[3], row[4], row[5], row[7]),
        ),
      )
      .sort((a, b) => {
        const ta = a.getOpenTime().toMs();
        const tb = b.getOpenTime().toMs();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
  }
}

