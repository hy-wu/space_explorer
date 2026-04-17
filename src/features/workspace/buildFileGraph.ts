import type { GraphData, GraphEdge, GraphNode } from "@/domain/graph";
import type { FileEntry, FolderHandle } from "@/infrastructure/fs/fileSystemAdapter";

const extensionTags: Record<string, string[]> = {
  ts: ["typescript", "code"],
  tsx: ["typescript", "react", "code"],
  js: ["javascript", "code"],
  jsx: ["javascript", "react", "code"],
  md: ["markdown", "note"],
  json: ["json", "data"],
  css: ["style"],
  html: ["markup"],
};

function makeId(prefix: string, value: string): string {
  return `${prefix}:${value.replaceAll("\\", "/")}`;
}

function titleFromPath(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1] ?? path;
}

function parentPathOf(path: string): string | null {
  const segments = path.split("/");
  if (segments.length <= 1) {
    return null;
  }

  return segments.slice(0, -1).join("/");
}

function folderPathsFor(files: FileEntry[], rootName: string): string[] {
  const paths = new Set<string>([rootName]);

  for (const file of files) {
    const segments = file.path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      paths.add(segments.slice(0, index).join("/"));
    }
  }

  return Array.from(paths).sort((left, right) => left.split("/").length - right.split("/").length);
}

function createFolderNode(path: string, rootName: string): GraphNode {
  return {
    id: makeId("folder", path),
    kind: "folder",
    title: path === rootName ? `${rootName}/` : `${titleFromPath(path)}/`,
    uri: path,
    tags: ["local", "folder"],
    meta: {
      path,
      depth: path.split("/").length - 1,
    },
  };
}

function createFileNode(file: FileEntry): GraphNode {
  const tags = ["local", "file", ...(extensionTags[file.extension] ?? []), file.extension || "unknown"];

  return {
    id: makeId("file", file.path),
    kind: "file",
    title: file.name,
    uri: file.path,
    tags: Array.from(new Set(tags)),
    meta: {
      path: file.path,
      extension: file.extension,
      size: file.size ?? 0,
    },
  };
}

function createHierarchyPositions(nodes: GraphNode[]): GraphNode[] {
  const byDepth = new Map<number, GraphNode[]>();

  for (const node of nodes) {
    const depth =
      typeof node.meta.depth === "number"
        ? node.meta.depth
        : typeof node.meta.path === "string"
          ? String(node.meta.path).split("/").length - 1
          : 0;

    const list = byDepth.get(depth) ?? [];
    list.push(node);
    byDepth.set(depth, list);
  }

  return nodes.map((node) => {
    const depth =
      typeof node.meta.depth === "number"
        ? node.meta.depth
        : typeof node.meta.path === "string"
          ? String(node.meta.path).split("/").length - 1
          : 0;
    const siblings = byDepth.get(depth) ?? [];
    const siblingIndex = siblings.findIndex((entry) => entry.id === node.id);
    const centeredIndex = siblingIndex - (siblings.length - 1) / 2;

    return {
      ...node,
      position: {
        x: centeredIndex * 90,
        y: -depth * 95,
        z: node.kind === "folder" ? depth * 18 : 120 + depth * 20,
      },
    };
  });
}

export function buildFileGraph(folder: FolderHandle, files: FileEntry[]): GraphData {
  const workspaceRoot: GraphNode = {
    id: "workspace-root",
    kind: "workspace",
    title: folder.name,
    uri: folder.path,
    tags: ["root", "workspace"],
    meta: {
      description: "Folder-backed graph workspace.",
      rootFolder: folder.name,
      fileCount: files.length,
    },
  };

  const folderNodes = folderPathsFor(files, folder.name).map((path) => createFolderNode(path, folder.name));
  const fileNodes = files.map((file) => createFileNode(file));
  const nodes = createHierarchyPositions([workspaceRoot, ...folderNodes, ...fileNodes]);

  const edges: GraphEdge[] = [];

  edges.push({
    id: "edge-workspace-root-folder",
    source: workspaceRoot.id,
    target: makeId("folder", folder.name),
    kind: "contains",
    directed: true,
    meta: {},
  });

  for (const path of folderPathsFor(files, folder.name)) {
    if (path === folder.name) {
      continue;
    }

    const parentPath = parentPathOf(path);
    if (!parentPath) {
      continue;
    }

    edges.push({
      id: `edge-folder-${path}`,
      source: makeId("folder", parentPath),
      target: makeId("folder", path),
      kind: "contains",
      directed: true,
      meta: {},
    });
  }

  for (const file of files) {
    const parentPath = parentPathOf(file.path);
    if (!parentPath) {
      continue;
    }

    edges.push({
      id: `edge-file-${file.path}`,
      source: makeId("folder", parentPath),
      target: makeId("file", file.path),
      kind: "contains",
      directed: true,
      meta: {},
    });
  }

  return { nodes, edges };
}
