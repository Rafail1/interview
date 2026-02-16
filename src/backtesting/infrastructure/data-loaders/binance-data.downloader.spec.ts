import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { ConfigService } from '@nestjs/config';
import { BinanceDataDownloader } from './binance-data.downloader';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  rename: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
  };
});

describe('BinanceDataDownloader', () => {
  const loggerMock = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const createConfigService = (overrides?: Record<string, string>) =>
    ({
      get: jest.fn((key: string) => {
        const defaults: Record<string, string> = {
          BINANCE_DATA_DIR: 'tmp/binance',
          BINANCE_RETRY_MAX: '3',
          BINANCE_DOWNLOAD_TIMEOUT_MS: '30000',
        };
        return overrides?.[key] ?? defaults[key];
      }),
    }) as unknown as ConfigService;

  const createDownloader = (configService: ConfigService) => {
    const axiosInstanceMock = {
      get: jest.fn(),
    };
    (axios.create as jest.Mock).mockReturnValue(axiosInstanceMock);

    const downloader = new BinanceDataDownloader(loggerMock, configService);
    return { downloader, axiosInstanceMock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached file when checksum is valid', async () => {
    const { downloader, axiosInstanceMock } = createDownloader(
      createConfigService(),
    );
    const expectedPath = path.join('tmp/binance', 'BTCUSDT-1m-2024-01.zip');

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    jest
      .spyOn(downloader as any, 'verifyChecksum')
      .mockResolvedValue(true);

    const result = await downloader.downloadMonthlyZip('BTCUSDT', '1m', '2024-01');

    expect(result).toBe(expectedPath);
    expect(axiosInstanceMock.get).not.toHaveBeenCalled();
    expect(loggerMock.log).toHaveBeenCalledWith(
      'Using cached file: BTCUSDT-1m-2024-01.zip',
    );
  });

  it('retries once and succeeds on second attempt', async () => {
    const { downloader, axiosInstanceMock } = createDownloader(
      createConfigService({ BINANCE_RETRY_MAX: '2' }),
    );

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    jest.spyOn(downloader as any, 'calculateSha256').mockResolvedValue('abc123');
    jest.spyOn(downloader as any, 'sleep').mockResolvedValue(undefined);

    axiosInstanceMock.get
      .mockRejectedValueOnce(new Error('temporary network issue'))
      .mockResolvedValueOnce({ data: Buffer.from('zip-bytes') })
      .mockResolvedValueOnce({ data: 'abc123 BTCUSDT-1m-2024-01.zip' });

    const result = await downloader.downloadMonthlyZip('BTCUSDT', '1m', '2024-01');

    expect(result).toBe(path.join('tmp/binance', 'BTCUSDT-1m-2024-01.zip'));
    expect(axiosInstanceMock.get).toHaveBeenCalledTimes(3);
    expect((fsPromises.writeFile as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect((fsPromises.rename as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect((downloader as any).sleep).toHaveBeenCalledWith(1000);
  });

  it('fails after max retries when checksum keeps failing', async () => {
    const { downloader, axiosInstanceMock } = createDownloader(
      createConfigService({ BINANCE_RETRY_MAX: '2' }),
    );

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => undefined);
    jest
      .spyOn(downloader as any, 'calculateSha256')
      .mockResolvedValue('local-hash');
    jest.spyOn(downloader as any, 'sleep').mockResolvedValue(undefined);
    axiosInstanceMock.get
      .mockResolvedValueOnce({ data: Buffer.from('zip-bytes') })
      .mockResolvedValueOnce({ data: 'published-hash BTCUSDT-1m-2024-01.zip' })
      .mockResolvedValueOnce({ data: Buffer.from('zip-bytes') })
      .mockResolvedValueOnce({ data: 'published-hash BTCUSDT-1m-2024-01.zip' });

    await expect(
      downloader.downloadMonthlyZip('BTCUSDT', '1m', '2024-01'),
    ).rejects.toThrow('Failed to download BTCUSDT-1m-2024-01.zip after 2 attempts');

    expect(axiosInstanceMock.get).toHaveBeenCalledTimes(4);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });
});
