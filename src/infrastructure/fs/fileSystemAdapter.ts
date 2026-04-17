export type FolderHandle = {
  id: string;
  name: string;
  path?: string;
};

export type FileEntry = {
  path: string;
  name: string;
  extension: string;
  size?: number;
};

export interface FileSystemAdapter {
  isSupported(): boolean;
  pickFolder(): Promise<FolderHandle | null>;
  listFiles(folder: FolderHandle): Promise<FileEntry[]>;
  readText(path: string): Promise<string>;
}
