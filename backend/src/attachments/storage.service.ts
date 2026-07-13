import { Readable } from 'stream';

export const FILE_STORAGE = 'FILE_STORAGE';

export interface FileStorage {
  /**
   * Zapisuje plik w storage.
   * @param file Obiekt pliku z Multera
   * @param key Unikalny klucz pliku do przechowania
   */
  save(file: Express.Multer.File, key: string): Promise<void>;

  /**
   * Otwiera strumień pliku ze storage.
   * @param key Unikalny klucz pliku do pobrania
   */
  open(key: string): Promise<Readable>;

  /**
   * Usuwa plik ze storage.
   * @param key Unikalny klucz pliku
   */
  delete(key: string): Promise<void>;

  /**
   * Sprawdza, czy plik istnieje.
   * @param key Unikalny klucz pliku
   */
  exists(key: string): Promise<boolean>;
}
