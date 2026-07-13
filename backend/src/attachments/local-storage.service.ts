import { Injectable, Logger } from '@nestjs/common';
import { FileStorage } from './storage.service';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class LocalFileStorage implements FileStorage {
  private readonly logger = new Logger(LocalFileStorage.name);
  private readonly uploadsPath = path.resolve(process.cwd(), 'uploads');

  constructor() {
    void this.ensureUploadsDirExists();
  }

  private async ensureUploadsDirExists() {
    try {
      await fs.mkdir(this.uploadsPath, { recursive: true });
    } catch (err) {
      this.logger.error('Failed to create uploads directory', err);
    }
  }

  private getFilePath(key: string): string {
    return path.join(this.uploadsPath, key);
  }

  async save(file: Express.Multer.File, key: string): Promise<void> {
    const targetPath = this.getFilePath(key);

    // Upewnijmy się, że używamy odpowiedniej metody zapisu zależnie od tego jak plik został załadowany.
    // Jeśli plik został wczytany do pamięci (memoryStorage), używamy file.buffer.
    // Jeśli użyto diskStorage, przenosimy plik (z tym że dla pewności, lepiej używać file.buffer w memoryStorage).
    if (file.buffer) {
      await fs.writeFile(targetPath, file.buffer);
    } else if (file.path) {
      await fs.rename(file.path, targetPath);
    } else {
      throw new Error('File data is missing');
    }
  }

  async open(key: string): Promise<Readable> {
    const targetPath = this.getFilePath(key);
    const fileExists = await this.exists(key);
    if (!fileExists) {
      throw new Error(`File not found: ${key}`);
    }
    return fsSync.createReadStream(targetPath);
  }

  async delete(key: string): Promise<void> {
    const targetPath = this.getFilePath(key);
    try {
      await fs.unlink(targetPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error(`Failed to delete file: ${targetPath}`, err);
        throw err;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const targetPath = this.getFilePath(key);
    try {
      await fs.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
