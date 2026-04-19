import type { FileEntry, FileSystemAdapter, FolderHandle } from "@/infrastructure/fs/fileSystemAdapter";
import * as pdfjs from "pdfjs-dist";

// Configure worker using Vite's static asset handling or a URL
// For Vite, the most robust way is to use the minified worker from the package
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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
  const ignoredDirs = new Set(["node_modules", "dist", "build", "out", ".git", ".next"]);

  for await (const [name, entry] of handle.entries()) {
    if (name.startsWith(".") && name !== ".env" && name !== ".gitignore") {
      continue;
    }

    if (entry.kind === "directory" && ignoredDirs.has(name)) {
      continue;
    }

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
    
    if (file.name.toLowerCase().endsWith(".pdf")) {
      return this.extractPdfText(file);
    }
    
    return file.text();
  }

  private async extractPdfText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) { // Limit to 20 pages for performance
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n";
      }
      
      return fullText;
    } catch (error) {
      console.error("PDF extraction failed:", error);
      return `[PDF Extraction Error: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }
}
