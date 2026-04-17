import { useMemo } from "react";
import { getNodeDisplayTitle } from "@/features/workspace/nodeDisplay";
import { useWorkspaceStore } from "@/store/workspaceStore";

type InspectorPanelProps = {
  selectedNodeId: string | null;
};

export function InspectorPanel({ selectedNodeId }: InspectorPanelProps) {
  const graph = useWorkspaceStore((state) => state.graph);

  const node = useMemo(
    () => graph.nodes.find((entry) => entry.id === selectedNodeId) ?? null,
    [graph.nodes, selectedNodeId],
  );

  if (!node) {
    return (
      <section className="panel">
        <p className="panel__title">Inspector</p>
        <p className="muted">Select a node to inspect its metadata and relationships.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="panel__title">Inspector</p>
      <h2>{getNodeDisplayTitle(node)}</h2>
      <dl className="meta-list">
        <div>
          <dt>Kind</dt>
          <dd>{node.kind}</dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{node.tags.join(", ") || "none"}</dd>
        </div>
        <div>
          <dt>URI</dt>
          <dd>{node.uri ?? "local-only"}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>{node.score ?? "n/a"}</dd>
        </div>
      <pre className="json-card">{JSON.stringify(node.meta, null, 2)}</pre>
      </dl>
    </section>
  );
}
