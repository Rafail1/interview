import axios, { AxiosInstance } from 'axios';
import { createHash } from 'crypto';
import { createReadStream, existsSync, unlinkSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { Inject, Injectable } from '@nestjs/common';
import {
  LOGGER_TOKEN,
  type ILogger,
} from 'src/core/interfaces/logger.interface';

/**
 * Downloads Binance monthly klines data and verifies checksums.
 * Handles retries, resume, and checksum validation.
 */
@Injectable()
export class BinanceDataDownloader {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl =
    'https://data.binance.vision/data/futures/um/monthly/klines';
  private readonly maxRetries: number;
  private readonly downloadTimeoutMs: number;

  constructor(
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
    private readonly cacheDir: string,
  ) {
    this.maxRetries = 3;
    this.downloadTimeoutMs = 30_000;

    this.axiosInstance = axios.create({
      timeout: this.downloadTimeoutMs,
      responseType: 'arraybuffer',
    });
  }

  /**
   * Download monthly klines ZIP file with retry logic
   */
  public async downloadMonthlyZip(
    symbol: string,
    interval: string,
    yearMonth: string, // "2024-01"
  ): Promise<string> {
    await mkdir(this.cacheDir, { recursive: true });

    const fileName = `${symbol}-${interval}-${yearMonth}.zip`;
    const filePath = join(this.cacheDir, fileName);

    // Check if already downloaded and checksummed
    if (existsSync(filePath)) {
      const isValid = await this.verifyChecksum(symbol, interval, yearMonth);
      if (isValid) {
        this.logger.log(`Using cached file: ${fileName}`);
        return filePath;
      } else {
        this.logger.warn(
          `Checksum mismatch for ${fileName}, re-downloading...`,
        );
        unlinkSync(filePath);
      }
    }

    const url = `${this.baseUrl}/${symbol}/${interval}/${fileName}`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(
          `Downloading ${fileName} (attempt ${attempt}/${this.maxRetries})...`,
        );

        const response = await this.axiosInstance.get(url);
        const buffer = response.data as Buffer;

        // Write to temp file first
        const tempPath = `${filePath}.tmp`;
        const fs = await import('fs/promises');
        await fs.writeFile(tempPath, buffer);

        // Verify checksum
        const isValid = await this.verifyChecksumFile(
          symbol,
          interval,
          yearMonth,
          tempPath,
        );
        if (!isValid) {
          unlinkSync(tempPath);
          throw new Error('Checksum verification failed');
        }

        // Move temp file to final location
        await fs.rename(tempPath, filePath);
        this.logger.log(`Successfully downloaded and verified: ${fileName}`);
        return filePath;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Download attempt ${attempt} failed: ${msg}`);

        if (attempt === this.maxRetries) {
          throw new Error(
            `Failed to download ${fileName} after ${this.maxRetries} attempts`,
          );
        }

        // Exponential backoff
        await this.sleep(Math.pow(2, attempt - 1) * 1000);
      }
    }

    throw new Error(`Failed to download ${fileName}`);
  }

  /**
   * Download and verify checksum file
   */
  private async verifyChecksum(
    symbol: string,
    interval: string,
    yearMonth: string,
  ): Promise<boolean> {
    const fileName = `${symbol}-${interval}-${yearMonth}.zip`;
    const filePath = join(this.cacheDir, fileName);

    if (!existsSync(filePath)) {
      return false;
    }

    return this.verifyChecksumFile(symbol, interval, yearMonth, filePath);
  }

  /**
   * Verify file checksum against Binance's published SHA256
   */
  private async verifyChecksumFile(
    symbol: string,
    interval: string,
    yearMonth: string,
    filePath: string,
  ): Promise<boolean> {
    const fileName = `${symbol}-${interval}-${yearMonth}.zip`;
    const checksumUrl = `${this.baseUrl}/${symbol}/${interval}/${fileName}.CHECKSUM`;

    try {
      const checksumResponse = await this.axiosInstance.get(checksumUrl, {
        responseType: 'text',
      });
      const checksumLine = checksumResponse.data as string;

      // Format: "sha256sum filename"
      const publishedHash = checksumLine.split(' ')[0].toLowerCase();

      // Calculate local hash
      const localHash = await this.calculateSha256(filePath);

      const isValid = publishedHash === localHash;
      if (!isValid) {
        this.logger.warn(
          `Checksum mismatch for ${fileName}: expected ${publishedHash}, got ${localHash}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.warn(
        `Failed to verify checksum for ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Calculate SHA256 hash of file
   */
  private async calculateSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Simple sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
