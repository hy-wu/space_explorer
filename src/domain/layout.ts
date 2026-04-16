import type { GraphData, GraphNode } from "@/domain/graph";

export type LayoutMode = "force" | "radial-query" | "hierarchy";

export function applyRadialQueryLayout(graph: GraphData, anchorId: string): GraphNode[] {
  const anchor = graph.nodes.find((node) => node.id === anchorId);
  if (!anchor) {
    return graph.nodes;
  }

  const results = graph.nodes.filter((node) => node.id !== anchorId);

  return graph.nodes.map((node) => {
    if (node.id === anchorId) {
      return {
        ...node,
        position: { x: 0, y: 0, z: 0 },
      };
    }

    const index = results.findIndex((candidate) => candidate.id === node.id);
    const ring = 120 + index * 35 - (node.score ?? 0) * 60;
    const angle = (index / Math.max(results.length, 1)) * Math.PI * 2;

    return {
      ...node,
      position: {
        x: Math.cos(angle) * ring,
        y: ((index % 4) - 1.5) * 28,
        z: Math.sin(angle) * ring,
      },
    };
  });
}
