import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ZipFile } from 'yazl';
import { BinanceKlinesParser } from './binance-klines.parser';
import { ZipExtractor } from '../market-data/zip.extractor';

function createZipWithCsv(zipPath: string, csvFileName: string, csvData: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const zipFile = new ZipFile();
    zipFile.addBuffer(Buffer.from(csvData, 'utf8'), csvFileName);
    zipFile.end();

    const output = fs.createWriteStream(zipPath);
    output.on('close', () => resolve());
    output.on('error', (error) => reject(error));
    zipFile.outputStream.pipe(output);
  });
}

describe('Binance ZIP + Parser integration', () => {
  it('extracts zip and parses Binance klines into Candle entities', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'binance-kline-test-'));
    const zipPath = path.join(tempDir, 'BTCUSDT-1m-2024-01.zip');
    const csvName = 'BTCUSDT-1m-2024-01.csv';

    const csv = [
      '1704067200000,42250.10,42280.00,42210.00,42260.20,12.5,1704067259999,528250.1,120,6.2,262000.5,0',
      '1704067260000,42260.20,42300.00,42255.00,42290.10,10.0,1704067319999,422901.0,98,4.8,203000.0,0',
    ].join('\n');

    await createZipWithCsv(zipPath, csvName, csv);

    const extractedCsvPath = await ZipExtractor.extractZip(zipPath);
    const candles = [];

    try {
      for await (const candle of BinanceKlinesParser.parseStream(
        extractedCsvPath,
        'BTCUSDT',
        '1m',
      )) {
        candles.push(candle);
      }

      expect(candles).toHaveLength(2);
      expect(candles[0].getSymbol()).toBe('BTCUSDT');
      expect(candles[0].getTimeframe().toString()).toBe('1m');
      expect(candles[0].getOpen().toString()).toBe('42250.1');
      expect(candles[0].getClose().toString()).toBe('42260.2');
      expect(candles[1].getOpenTime().toMs()).toBe(1704067260000n);
    } finally {
      ZipExtractor.cleanup(path.dirname(extractedCsvPath));
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
