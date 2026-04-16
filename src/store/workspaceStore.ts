import { create } from "zustand";
import type { GraphData, GraphEdge, GraphNode, RelationKind } from "@/domain/graph";
import { applyRadialQueryLayout } from "@/domain/layout";

type Position = {
  x: number;
  y: number;
  z: number;
};

type WorkspaceState = {
  graph: GraphData;
  selectedNodeId: string | null;
  selectNode: (nodeId: string) => void;
  pinNode: (nodeId: string, position: Position) => void;
  runDemoSearch: (query: string) => void;
};

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
    },
  },
  {
    id: "file-app",
    kind: "file",
    title: "App.tsx",
    tags: ["typescript", "ui"],
    meta: {
      path: "/workspace/src/App.tsx",
    },
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
  },
  {
    id: "note-vision",
    kind: "note",
    title: "Vision notes",
    tags: ["product", "idea"],
    meta: {
      summary: "Graph-native browser/OS/IDE concept.",
    },
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

function createSearchGraph(query: string): GraphData {
  const queryNode: GraphNode = {
    id: "search-query",
    kind: "search_query",
    title: query,
    tags: ["query"],
    score: 1,
    meta: {
      createdAt: new Date().toISOString(),
      mode: "demo-search",
    },
  };

  const resultNodes: GraphNode[] = [
    {
      id: "result-1",
      kind: "search_result",
      title: "3D knowledge workspace patterns",
      tags: ["ux", "graph"],
      score: 0.96,
      meta: {
        source: "tutorial",
        why: "Strong match on graph-native workspace interaction.",
      },
    },
    {
      id: "result-2",
      kind: "search_result",
      title: "Codebase visualization with symbol graphs",
      tags: ["code", "graph"],
      score: 0.89,
      meta: {
        source: "paper",
        why: "Relevant to IDE and structure visualization.",
      },
    },
    {
      id: "result-3",
      kind: "search_result",
      title: "Local-first note and document graph",
      tags: ["notes", "storage"],
      score: 0.84,
      meta: {
        source: "article",
        why: "Relevant to unifying notes and files in one graph.",
      },
    },
    {
      id: "answer-1",
      kind: "ai_answer",
      title: "AI synthesis",
      tags: ["answer"],
      score: 0.91,
      meta: {
        summary:
          "Use a query anchor, cluster results by similarity, and keep dragged positions as persistent user intent.",
      },
    },
  ];

  const edges: GraphEdge[] = [
    ...resultNodes.map<GraphEdge>((node, index) => {
      const kind: RelationKind = node.kind === "ai_answer" ? "answers" : "related_to";

      return {
        id: `edge-query-${node.id}`,
        source: "search-query",
        target: node.id,
        kind,
        weight: 1 - index * 0.1,
        meta: {},
      };
    }),
    {
      id: "edge-result-1-2",
      source: "result-1",
      target: "result-2",
      kind: "similar_to",
      weight: 0.88,
      meta: {},
    },
    {
      id: "edge-result-1-3",
      source: "result-1",
      target: "result-3",
      kind: "similar_to",
      weight: 0.64,
      meta: {},
    },
    {
      id: "edge-result-2-answer",
      source: "result-2",
      target: "answer-1",
      kind: "generated_from",
      weight: 0.7,
      meta: {},
    },
  ];

  const graph = {
    nodes: [queryNode, ...resultNodes],
    edges,
  };

  return {
    ...graph,
    nodes: applyRadialQueryLayout(graph, queryNode.id),
  };
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  graph: {
    nodes: seedNodes,
    edges: seedEdges,
  },
  selectedNodeId: "workspace-root",
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  pinNode: (nodeId, position) =>
    set((state) => ({
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
  runDemoSearch: (query) =>
    set({
      graph: createSearchGraph(query),
      selectedNodeId: "search-query",
    }),
}));
