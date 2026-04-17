import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { useMemo } from "react";
import type { GraphEdge, GraphNode } from "@/domain/graph";
import { getNodeDisplayTitle } from "@/features/workspace/nodeDisplay";
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

function linkEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : (endpoint as GraphNode).id;
}

function defaultNodeColor(node: GraphNode): string {
  switch (node.kind) {
    case "workspace":
      return "#34d399";
    case "folder":
      return "#fbbf24";
    case "file":
      return "#60a5fa";
    case "symbol":
      return "#c084fc";
    case "note":
      return "#2dd4bf";
    default:
      return "#94a3b8";
  }
}

export function GraphScene() {
  const graph = useWorkspaceStore((state) => state.graph);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const searchSession = useWorkspaceStore((state) => state.searchSession);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const pinNode = useWorkspaceStore((state) => state.pinNode);

  const searchRelatedNodeIds = useMemo(() => {
    if (!searchSession) {
      return new Set<string>();
    }

    return new Set([
      searchSession.queryNodeId,
      ...searchSession.resultNodeIds,
      ...(searchSession.answerNodeId ? [searchSession.answerNodeId] : []),
    ]);
  }, [searchSession]);

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
        const typedLink = link as ForceGraphLink;
        const sourceId = linkEndpointId(typedLink.source);
        const targetId = linkEndpointId(typedLink.target);
        const kind = String(typedLink.kind ?? "");

        if (sourceId === selectedNodeId || targetId === selectedNodeId) {
          return "#f59e0b";
        }

        return kind === "similar_to" ? "#76e4f7" : kind === "generated_from" ? "#8b5cf6" : "#3c5e82";
      }}
      linkOpacity={0.35}
      linkWidth={(link) => {
        const typedLink = link as ForceGraphLink;
        return typedLink.weight ? Math.max(1, typedLink.weight * 2) : 1;
      }}
      nodeLabel={(node) => {
        const typedNode = node as GraphNode;
        return `${getNodeDisplayTitle(typedNode)} (${typedNode.kind})`;
      }}
      nodeColor={(node: object) => {
        const typedNode = node as GraphNode;

        if (typedNode.id === selectedNodeId) {
          return "#f59e0b";
        }

        if (searchRelatedNodeIds.has(typedNode.id)) {
          return typedNode.kind === "search_query"
            ? "#22d3ee"
            : typedNode.kind === "ai_answer"
              ? "#f472b6"
              : "#60a5fa";
        }

        return defaultNodeColor(typedNode);
      }}
      nodeVal={(node: object) => 6 + (((node as GraphNode).score as number | undefined) ?? 0) * 10}
      nodeThreeObject={(node: object) => {
        const typedNode = node as GraphNode;
        const sprite = new SpriteText(getNodeDisplayTitle(typedNode));
        sprite.color = typedNode.id === selectedNodeId ? "#fcd34d" : "#e5f0ff";
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
