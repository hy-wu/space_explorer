import type { FileEntry, FileSystemAdapter, FolderHandle } from "@/infrastructure/fs/fileSystemAdapter";

type BrowserFileHandle = {
  kind: "file";
  getFile: () => Promise<File>;
};

type BrowserDirectoryHandle = {
  kind: "directory";
  name: string;
  entries: () => AsyncIterableIterator<[string, BrowserDirectoryHandle | BrowserFileHandle]>;
};

type DirectoryPickerWindow = Window &
  typeof globalThis & {
    showDirectoryPicker?: () => Promise<BrowserDirectoryHandle>;
  };

async function collectFiles(
  handle: BrowserDirectoryHandle,
  root = handle.name,
  fileHandles?: Map<string, BrowserFileHandle>,
): Promise<FileEntry[]> {
  const files: FileEntry[] = [];

  for await (const [name, entry] of handle.entries()) {
    const currentPath = `${root}/${name}`;

    if (entry.kind === "file") {
      const file = await entry.getFile();
      const dotIndex = name.lastIndexOf(".");
      fileHandles?.set(currentPath, entry);
      files.push({
        path: currentPath,
        name,
        extension: dotIndex >= 0 ? name.slice(dotIndex + 1) : "",
        size: file.size,
      });
      continue;
    }

    files.push(...(await collectFiles(entry as BrowserDirectoryHandle, currentPath, fileHandles)));
  }

  return files;
}

export class BrowserFileSystemAdapter implements FileSystemAdapter {
  private currentHandle: BrowserDirectoryHandle | null = null;
  private fileHandles = new Map<string, BrowserFileHandle>();

  isSupported(): boolean {
    const pickerWindow = window as DirectoryPickerWindow;
    return Boolean(pickerWindow.showDirectoryPicker);
  }

  async pickFolder(): Promise<FolderHandle | null> {
    const pickerWindow = window as DirectoryPickerWindow;
    if (!pickerWindow.showDirectoryPicker) {
      return null;
    }

    const handle = await pickerWindow.showDirectoryPicker();
    this.currentHandle = handle;

    return {
      id: handle.name,
      name: handle.name,
    };
  }

  async listFiles(folder: FolderHandle): Promise<FileEntry[]> {
    if (!this.currentHandle || this.currentHandle.name !== folder.name) {
      return [];
    }

    this.fileHandles.clear();
    return collectFiles(this.currentHandle, this.currentHandle.name, this.fileHandles);
  }

  async readText(path: string): Promise<string> {
    const handle = this.fileHandles.get(path);
    if (!handle) {
      return "";
    }

    const file = await handle.getFile();
    return file.text();
  }
}
