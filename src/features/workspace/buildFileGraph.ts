import type { GraphData, GraphEdge, GraphNode } from "@/domain/graph";
import type { FileEntry, FolderHandle } from "@/infrastructure/fs/fileSystemAdapter";
import type { ParsedModule } from "@/infrastructure/parser/codeParserAdapter";

const extensionTags: Record<string, string[]> = {
  ts: ["typescript", "code"],
  tsx: ["typescript", "react", "code"],
  js: ["javascript", "code"],
  jsx: ["javascript", "react", "code"],
  py: ["python", "code"],
  c: ["c", "code"],
  cpp: ["cpp", "code"],
  cc: ["cpp", "code"],
  cxx: ["cpp", "code"],
  h: ["cpp", "header", "code"],
  hpp: ["cpp", "header", "code"],
  cu: ["cuda", "nvidia", "code"],
  cuh: ["cuda", "header", "code"],
  tex: ["latex", "note"],
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

export function enrichFileGraphWithContent(
  graph: GraphData,
  fileContents: Record<string, string>,
): GraphData {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.kind !== "file") {
        return node;
      }

      const path = typeof node.meta.path === "string" ? node.meta.path : "";
      const content = fileContents[path] ?? "";
      const compact = content.replace(/\s+/g, " ").trim();

      return {
        ...node,
        meta: {
          ...node.meta,
          content,
          contentPreview: compact.slice(0, 300),
        },
      };
    }),
  };
}

function resolveImportPath(basePath: string, importPath: string): string | null {
  if (!importPath.startsWith(".")) return null;
  const baseParts = basePath.split("/");
  baseParts.pop(); // remove filename
  const importParts = importPath.split("/");
  for (const part of importParts) {
    if (part === ".") continue;
    if (part === "..") baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join("/");
}

export function enrichFileGraphWithCodeStructure(
  graph: GraphData,
  parsedModules: Record<string, ParsedModule>,
): GraphData {
  const newNodes: GraphNode[] = [...graph.nodes];
  const newEdges: GraphEdge[] = [...graph.edges];
  
  // 1. Build lookup maps
  const filePaths = new Map<string, string>(); // path (no ext) -> nodeId
  const symbolMap = new Map<string, string>(); // symbolName -> symbolNodeId
  
  for (const node of graph.nodes) {
    if (node.kind === "file" && typeof node.meta.path === "string") {
      const withoutExt = node.meta.path.replace(/\.[^/.]+$/, "");
      filePaths.set(withoutExt, node.id);
      filePaths.set(node.meta.path, node.id);
    }
  }

  // 2. Add symbol nodes and fill symbolMap
  for (const [filePath, parsed] of Object.entries(parsedModules)) {
    const fileNodeId = makeId("file", filePath);
    
    for (const symbol of parsed.symbols) {
      const symbolNodeId = makeId("symbol", symbol.id);
      symbolMap.set(symbol.name, symbolNodeId); // Global index for simple name lookup

      newNodes.push({
        id: symbolNodeId,
        kind: "symbol",
        title: symbol.name,
        uri: symbol.id,
        tags: ["code", "symbol", symbol.kind],
        meta: { kind: symbol.kind, exported: symbol.exported, filePath },
        position: { x: 0, y: 0, z: 0 },
      });

      newEdges.push({
        id: `edge-defines-${fileNodeId}-${symbolNodeId}`,
        source: fileNodeId,
        target: symbolNodeId,
        kind: "defines",
        directed: true,
        meta: {},
        weight: 0.5,
      });
    }
  }

  // 3. Add relationship edges (Imports & References)
  for (const [filePath, parsed] of Object.entries(parsedModules)) {
    const fileNodeId = makeId("file", filePath);

    // File-to-File Imports
    for (const importPath of parsed.imports) {
      let targetFileNodeId: string | undefined;

      if (importPath.startsWith(".")) {
        const resolvedPath = resolveImportPath(filePath, importPath);
        if (resolvedPath) {
          targetFileNodeId = filePaths.get(resolvedPath) || filePaths.get(resolvedPath + "/index");
        }
      } else {
        targetFileNodeId = filePaths.get(importPath) || filePaths.get(importPath + "/__init__");
        if (!targetFileNodeId) {
          for (const [knownPath, nodeId] of filePaths.entries()) {
            if (knownPath.endsWith(`/${importPath}`) || knownPath.endsWith(`/${importPath}/__init__`)) {
              targetFileNodeId = nodeId;
              break;
            }
          }
        }
      }
      
      if (targetFileNodeId) {
        newEdges.push({
          id: `edge-imports-${fileNodeId}-${targetFileNodeId}`,
          source: fileNodeId,
          target: targetFileNodeId,
          kind: "imports",
          directed: true,
          meta: {},
          weight: 0.2,
        });
      }
    }

    // Precise Symbol-to-Symbol References
    const refs = parsed.references || [];
    for (const refName of refs) {
      const targetSymbolId = symbolMap.get(refName);
      if (targetSymbolId) {
        newEdges.push({
          id: `edge-ref-${fileNodeId}-${targetSymbolId}-${Math.random().toString(36).substr(2, 4)}`,
          source: fileNodeId,
          target: targetSymbolId,
          kind: "references",
          directed: true,
          meta: {},
          weight: 0.5,
        });
      }
    }
  }

  return { nodes: newNodes, edges: newEdges };
}
