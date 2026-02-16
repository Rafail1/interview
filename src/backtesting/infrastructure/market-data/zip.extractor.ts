import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { createReadStream, createWriteStream } from 'fs';

/**
 * Extracts ZIP files downloaded from Binance.
 * Handles streaming extraction to avoid loading entire archive into memory.
 */
export class ZipExtractor {
  /**
   * Extract a ZIP file to a temporary directory
   * Returns path to extracted .csv file
   *
   * Note: This is a simplified implementation using native zlib.
   * For complex ZIP structures, consider 'unzipper' or 'adm-zip' libraries.
   */
  public static async extractZip(zipPath: string): Promise<string> {
    if (!fs.existsSync(zipPath)) {
      throw new Error(`ZIP file not found: ${zipPath}`);
    }

    const stat = fs.statSync(zipPath);
    if (!stat.isFile()) {
      throw new Error(`Not a file: ${zipPath}`);
    }

    const tmpDir = path.join(path.dirname(zipPath), `extract_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // Attempt to decompress gzip file (Binance ZIPs are gzip)
      const csvPath = zipPath.replace(/\.zip$/, '.csv');
      const outputPath = path.join(tmpDir, path.basename(csvPath));

      await this.decompressGzip(zipPath, outputPath);

      return outputPath;
    } catch (error) {
      // Cleanup on error
      fs.rmSync(tmpDir, { recursive: true, force: true });
      throw new Error(`Failed to extract ZIP: ${zipPath}. Error: ${error}`);
    }
  }

  /**
   * Decompress a gzip file using streams (memory efficient)
   */
  private static async decompressGzip(
    gzipPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(gzipPath);
      const writeStream = createWriteStream(outputPath);
      const gunzip = zlib.createGunzip();

      readStream
        .pipe(gunzip)
        .pipe(writeStream)
        .on('finish', () => resolve())
        .on('error', (error) => {
          fs.unlink(outputPath, () => {}); // cleanup
          reject(error);
        });

      readStream.on('error', (error) => {
        writeStream.destroy();
        fs.unlink(outputPath, () => {}); // cleanup
        reject(error);
      });

      gunzip.on('error', (error) => {
        writeStream.destroy();
        fs.unlink(outputPath, () => {}); // cleanup
        reject(error);
      });
    });
  }

  /**
   * Clean up temporary extraction directory
   */
  public static cleanup(tmpDir: string): void {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
