import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { useMemo } from "react";
import type { GraphEdge, GraphNode } from "@/domain/graph";
import { useWorkspaceStore } from "@/store/workspaceStore";

type ForceGraphNode = GraphNode & {
  x?: number;
  y?: number;
  z?: number;
};

type ForceGraphLink = GraphEdge & {
  source: string | GraphNode;
  target: string | GraphNode;
};

export function GraphScene() {
  const graph = useWorkspaceStore((state) => state.graph);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const pinNode = useWorkspaceStore((state) => state.pinNode);

  const graphData = useMemo(
    () => ({
      nodes: graph.nodes,
      links: graph.edges.map((edge) => ({
        ...edge,
        source: edge.source,
        target: edge.target,
      })),
    }),
    [graph],
  );

  return (
    <ForceGraph3D
      graphData={graphData}
      backgroundColor="#07111f"
      linkColor={(link) => {
        const kind = String((link as ForceGraphLink).kind ?? "");
        return kind === "similar_to" ? "#76e4f7" : "#3c5e82";
      }}
      linkOpacity={0.35}
      linkWidth={(link) => {
        const typedLink = link as ForceGraphLink;
        return typedLink.weight ? Math.max(1, typedLink.weight * 2) : 1;
      }}
      nodeLabel={(node) => {
        const typedNode = node as GraphNode;
        return `${typedNode.title} (${typedNode.kind})`;
      }}
      nodeAutoColorBy="kind"
      nodeVal={(node: object) => 6 + (((node as GraphNode).score as number | undefined) ?? 0) * 10}
      nodeThreeObject={(node: object) => {
        const typedNode = node as GraphNode;
        const sprite = new SpriteText(typedNode.title);
        sprite.color = "#e5f0ff";
        sprite.textHeight = 7;
        return sprite;
      }}
      onNodeClick={(node: object) => selectNode((node as GraphNode).id)}
      onNodeDragEnd={(node: object) => {
        const dragged = node as ForceGraphNode;
        pinNode(dragged.id, {
          x: dragged.x ?? 0,
          y: dragged.y ?? 0,
          z: dragged.z ?? 0,
        });
      }}
    />
  );
}
