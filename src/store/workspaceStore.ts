import { create } from "zustand";
import type { GraphData, GraphEdge, GraphNode } from "@/domain/graph";
import {
  buildInteractiveSearchGraph,
  type LocalSearchMode,
  type SearchHistoryEntry,
  type SearchRequest,
  type SearchSession,
  type SearchSource,
} from "@/features/search/searchGraph";
import {
  searchArXiv,
  searchCrossref,
  searchDuckDuckGo,
  // searchGoogleBooks,
  searchHackerNews,
  searchOpenAlex,
  // searchSearXNG,
  // searchSemanticScholar,
  searchWikipedia,
} from "@/features/search/webSearch";
import { buildFileGraph, enrichFileGraphWithContent, enrichFileGraphWithCodeStructure } from "@/features/workspace/buildFileGraph";
import { BrowserFileSystemAdapter } from "@/infrastructure/fs/browserFileSystemAdapter";
import type { FolderHandle } from "@/infrastructure/fs/fileSystemAdapter";
import { SimpleCodeParserAdapter } from "@/infrastructure/parser/simpleCodeParserAdapter";
import type { ParsedModule } from "@/infrastructure/parser/codeParserAdapter";

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
  activeSearchSource: SearchSource;
  activeLocalSearchMode: LocalSearchMode;
  maxFontSize: number;
  searchMaxResults: number;
  setMaxFontSize: (size: number) => void;
  setSearchMaxResults: (results: number) => void;
  selectNode: (nodeId: string) => void;
  pinNode: (nodeId: string, position: Position) => void;
  setSearchSource: (source: SearchSource) => void;
  setLocalSearchMode: (mode: LocalSearchMode) => void;
  importFolder: (isProject?: boolean) => Promise<void>;
  runSearch: (request: SearchRequest) => Promise<void>;
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
  isImportingProject: false,
  importError: null,
  searchHistory: [],
  searchSession: null,
  activeSearchSource: "local-files",
  activeLocalSearchMode: "semantic",
  maxFontSize: 40,
  searchMaxResults: 6,
  setMaxFontSize: (size) => set({ maxFontSize: size }),
  setSearchMaxResults: (results) => set({ searchMaxResults: results }),
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
  setSearchSource: (source) => set({ activeSearchSource: source }),
  setLocalSearchMode: (mode) => set({ activeLocalSearchMode: mode }),
  importFolder: async (isProject = false) => {
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
      const textFriendlyExtensions = new Set([
        "ts",
        "tsx",
        "js",
        "jsx",
        "py",
        "json",
        "md",
        "txt",
        "css",
        "html",
        "yml",
        "yaml",
      ]);
      const fileContents = Object.fromEntries(
        await Promise.all(
          files.map(async (file) => {
            if (!textFriendlyExtensions.has(file.extension.toLowerCase())) {
              return [file.path, ""] as const;
            }

            try {
              const content = await fileSystemAdapter.readText(file.path);
              return [file.path, content] as const;
            } catch {
              return [file.path, ""] as const;
            }
          }),
        ),
      );
      let enrichedGraph = enrichFileGraphWithContent(graph, fileContents);

      if (isProject) {
        // Parse code files
        const parser = new SimpleCodeParserAdapter();
        const parsedModules: Record<string, ParsedModule> = {};
        
        for (const file of files) {
          if (parser.supports(file.path)) {
            const content = fileContents[file.path];
            if (content) {
              parsedModules[file.path] = await parser.parseModule(file.path, content);
            }
          }
        }

        enrichedGraph = enrichFileGraphWithCodeStructure(enrichedGraph, parsedModules);
      }

      set({
        baseGraph: enrichedGraph,
        graph: enrichedGraph,
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
  runSearch: async (request) => {
    const trimmed = request.query.trim();
    if (!trimmed) {
      return;
    }

    const state = useWorkspaceStore.getState();
    const nextRequest: SearchRequest = {
      ...request,
      query: trimmed,
      maxResults: request.maxResults ?? state.searchMaxResults,
    };

    try {
      const next = await buildInteractiveSearchGraph(
        request.baseNodeId ? state.graph : state.baseGraph,
        nextRequest,
        state.searchHistory,
        {
          searchWikipedia,
          searchArXiv,
          searchDuckDuckGo,
          searchOpenAlex,
          searchCrossref,
          // searchSearXNG,
          searchHackerNews,
          // searchSemanticScholar,
          // searchGoogleBooks,
        },
      );

      set({
        graph: next.graph,
        importError: null,
        searchHistory: next.session.history,
        searchSession: next.session,
        selectedNodeId: next.session.queryNodeId,
      });
    } catch (error) {
      set({
        importError: error instanceof Error ? error.message : "Search failed.",
      });
    }
  },
  clearSearch: () =>
    set((state) => ({
      graph: state.baseGraph,
      searchSession: null,
      selectedNodeId: state.baseGraph.nodes[0]?.id ?? null,
    })),
}));
