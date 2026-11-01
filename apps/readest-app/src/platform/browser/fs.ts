import { unsupported } from './unsupported';
export enum BaseDirectory {
  AppData = 1,
  AppCache = 2,
  AppConfig = 3,
  AppLog = 4,
  Temp = 5,
}
export enum SeekMode {
  Start = 0,
  Current = 1,
  End = 2,
}
export interface WriteFileOptions {
  baseDir?: BaseDirectory;
  append?: boolean;
  create?: boolean;
  createNew?: boolean;
}
export interface DirEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}
export interface FileInfo {
  size: number;
  mtime: Date | null;
  atime: Date | null;
  birthtime: Date | null;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}
/** Browser persistence uses WebAppService/IndexedDB, never OS filesystem paths. */
export class FileHandle {
  read = unsupported<number | null>;
  write = unsupported<number>;
  seek = unsupported<number>;
  stat = unsupported<FileInfo>;
  truncate = unsupported<void>;
  close = async () => {};
}
export const open = unsupported<FileHandle>;
export const exists = unsupported<boolean>;
export const stat = unsupported<FileInfo>;
export const readDir = unsupported<DirEntry[]>;
export const readTextFile = unsupported<string>;
export const readFile = unsupported<Uint8Array<ArrayBuffer>>;
export const mkdir = unsupported<void>;
export const writeFile = unsupported<void>;
export const writeTextFile = unsupported<void>;
export const remove = unsupported<void>;
export const rename = unsupported<void>;
export const copyFile = unsupported<void>;
