import { create } from "zustand";
import type { GraphData, GraphEdge, GraphNode } from "@/domain/graph";
import {
  buildInteractiveSearchGraph,
  type SearchHistoryEntry,
  type SearchSession,
} from "@/features/search/searchGraph";
import { buildFileGraph } from "@/features/workspace/buildFileGraph";
import { BrowserFileSystemAdapter } from "@/infrastructure/fs/browserFileSystemAdapter";
import type { FolderHandle } from "@/infrastructure/fs/fileSystemAdapter";

type Position = {
  x: number;
  y: number;
  z: number;
};

type WorkspaceState = {
  baseGraph: GraphData;
  graph: GraphData;
  selectedNodeId: string | null;
  activeFolder: FolderHandle | null;
  isImportingFolder: boolean;
  importError: string | null;
  searchHistory: SearchHistoryEntry[];
  searchSession: SearchSession | null;
  selectNode: (nodeId: string) => void;
  pinNode: (nodeId: string, position: Position) => void;
  importFolder: () => Promise<void>;
  runSearch: (query: string) => void;
  clearSearch: () => void;
};

const fileSystemAdapter = new BrowserFileSystemAdapter();

const seedNodes: GraphNode[] = [
  {
    id: "workspace-root",
    kind: "workspace",
    title: "My Graph Workspace",
    tags: ["root"],
    meta: {
      description: "Single space for files, tabs, code, notes, and search.",
    },
  },
  {
    id: "folder-src",
    kind: "folder",
    title: "src/",
    tags: ["local", "code"],
    meta: {
      path: "/workspace/src",
      depth: 1,
    },
    position: { x: -80, y: -100, z: 20 },
  },
  {
    id: "file-app",
    kind: "file",
    title: "App.tsx",
    tags: ["typescript", "ui"],
    meta: {
      path: "/workspace/src/App.tsx",
      extension: "tsx",
    },
    position: { x: -120, y: -180, z: 140 },
  },
  {
    id: "symbol-graph-scene",
    kind: "symbol",
    title: "GraphScene",
    tags: ["component"],
    meta: {
      file: "App.tsx",
      exported: true,
    },
    position: { x: 40, y: -180, z: 160 },
  },
  {
    id: "note-vision",
    kind: "note",
    title: "Vision notes",
    tags: ["product", "idea", "graph", "ide"],
    meta: {
      summary: "Graph-native browser/OS/IDE concept.",
    },
    position: { x: 120, y: 20, z: 80 },
  },
];

const seedEdges: GraphEdge[] = [
  {
    id: "edge-root-folder",
    source: "workspace-root",
    target: "folder-src",
    kind: "contains",
    directed: true,
    meta: {},
  },
  {
    id: "edge-folder-file",
    source: "folder-src",
    target: "file-app",
    kind: "contains",
    directed: true,
    meta: {},
  },
  {
    id: "edge-file-symbol",
    source: "file-app",
    target: "symbol-graph-scene",
    kind: "contains",
    directed: true,
    meta: {},
  },
  {
    id: "edge-note-root",
    source: "note-vision",
    target: "workspace-root",
    kind: "related_to",
    meta: {},
  },
];

const seedGraph: GraphData = {
  nodes: seedNodes,
  edges: seedEdges,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  baseGraph: seedGraph,
  graph: seedGraph,
  selectedNodeId: "workspace-root",
  activeFolder: null,
  isImportingFolder: false,
  importError: null,
  searchHistory: [],
  searchSession: null,
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  pinNode: (nodeId, position) =>
    set((state) => ({
      baseGraph: {
        ...state.baseGraph,
        nodes: state.baseGraph.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                pinned: true,
                position,
              }
            : node,
        ),
      },
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                pinned: true,
                position,
              }
            : node,
        ),
      },
    })),
  importFolder: async () => {
    if (!fileSystemAdapter.isSupported()) {
      set({
        importError: "This browser does not support folder picking yet. Chrome or Edge is recommended for the MVP.",
      });
      return;
    }

    set({
      isImportingFolder: true,
      importError: null,
    });

    try {
      const folder = await fileSystemAdapter.pickFolder();
      if (!folder) {
        set({
          isImportingFolder: false,
          importError: "Folder selection was cancelled.",
        });
        return;
      }

      const files = await fileSystemAdapter.listFiles(folder);
      const graph = buildFileGraph(folder, files);

      set({
        baseGraph: graph,
        graph,
        activeFolder: folder,
        selectedNodeId: "workspace-root",
        isImportingFolder: false,
        importError: null,
        searchSession: null,
      });
    } catch (error) {
      set({
        isImportingFolder: false,
        importError: error instanceof Error ? error.message : "Failed to import folder.",
      });
    }
  },
  runSearch: (query) =>
    set((state) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return state;
      }

      const next = buildInteractiveSearchGraph(state.baseGraph, trimmed, state.searchHistory);

      return {
        graph: next.graph,
        importError: null,
        searchHistory: next.session.history,
        searchSession: next.session,
        selectedNodeId: next.session.queryNodeId,
      };
    }),
  clearSearch: () =>
    set((state) => ({
      graph: state.baseGraph,
      searchSession: null,
      selectedNodeId: state.baseGraph.nodes[0]?.id ?? null,
    })),
}));
