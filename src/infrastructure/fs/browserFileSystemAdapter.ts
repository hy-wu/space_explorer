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
): Promise<FileEntry[]> {
  const files: FileEntry[] = [];

  for await (const [name, entry] of handle.entries()) {
    const currentPath = `${root}/${name}`;

    if (entry.kind === "file") {
      const file = await entry.getFile();
      const dotIndex = name.lastIndexOf(".");
      files.push({
        path: currentPath,
        name,
        extension: dotIndex >= 0 ? name.slice(dotIndex + 1) : "",
        size: file.size,
      });
      continue;
    }

    files.push(...(await collectFiles(entry as BrowserDirectoryHandle, currentPath)));
  }

  return files;
}

export class BrowserFileSystemAdapter implements FileSystemAdapter {
  private currentHandle: BrowserDirectoryHandle | null = null;

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

    return collectFiles(this.currentHandle);
  }

  async readText(path: string): Promise<string> {
    return `Reading "${path}" is not wired yet in the browser adapter.`;
  }
}
