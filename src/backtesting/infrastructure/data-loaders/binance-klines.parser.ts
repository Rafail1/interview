import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';

/**
 * Parses Binance klines CSV format into domain Candle entities.
 * Designed for streaming: yields candles one-by-one without loading entire file.
 */
export class BinanceKlinesParser {
  /**
   * Parse CSV file stream and yield Candle entities
   * CSV format: [openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, ...]
   */
  public static async *parseStream(
    filePath: string,
    symbol: string,
    interval: string,
  ): AsyncGenerator<Candle> {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;
    for await (const line of rl) {
      lineNumber++;
      // Skip empty lines
      if (!line.trim()) {
        continue;
      }

      try {
        const row = line.split(',').map((col) => col.trim());
        if (lineNumber === 1 && this.isHeaderRow(row)) {
          continue;
        }
        const candle = Candle.fromBinanceRow(symbol, interval, row);
        yield candle;
      } catch (error) {
        throw new Error(
          `Failed to parse Binance kline at line ${lineNumber}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private static isHeaderRow(row: string[]): boolean {
    if (row.length < 6) {
      return false;
    }

    const normalized = row.map((column) => column.toLowerCase());
    const firstColumn = normalized[0]?.replace(/[\s_-]/g, '');
    if (firstColumn === 'opentime') {
      return true;
    }

    const hasOpenColumn = normalized.some(
      (column) => column === 'open' || column === 'open price',
    );
    const hasCloseColumn = normalized.some(
      (column) => column === 'close' || column === 'close price',
    );
    return hasOpenColumn && hasCloseColumn;
  }

  /**
   * Parse entire file into memory (use sparingly for large files)
   */
  public static async parseFile(
    filePath: string,
    symbol: string,
    interval: string,
  ): Promise<Candle[]> {
    const candles: Candle[] = [];
    for await (const candle of this.parseStream(filePath, symbol, interval)) {
      candles.push(candle);
    }
    return candles;
  }
}
