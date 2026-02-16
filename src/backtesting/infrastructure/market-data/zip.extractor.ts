import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';

export class ZipExtractor {
  public static async extractZip(zipPath: string): Promise<string> {
    if (!fs.existsSync(zipPath)) {
      throw new Error(`ZIP file not found: ${zipPath}`);
    }

    const stat = fs.statSync(zipPath);
    if (!stat.isFile()) {
      throw new Error(`Not a file: ${zipPath}`);
    }

    const directory = await unzipper.Open.file(zipPath);
    const csvEntry = directory.files.find((entry) =>
      entry.path.toLowerCase().endsWith('.csv'),
    );

    if (!csvEntry) {
      throw new Error(`No CSV file found in ZIP archive: ${zipPath}`);
    }

    const tmpDir = path.join(path.dirname(zipPath), `extract_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const outputPath = path.join(tmpDir, path.basename(csvEntry.path));
    await new Promise<void>((resolve, reject) => {
      csvEntry
        .stream()
        .pipe(fs.createWriteStream(outputPath))
        .on('finish', () => resolve())
        .on('error', (error: unknown) =>
          reject(error instanceof Error ? error : new Error(String(error))),
        );
    });

    return outputPath;
  }

  public static cleanup(tmpDir: string): void {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
