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
      </dl>

      {typeof node.meta.explanation === "string" && (
        <div style={{ marginTop: "16px", padding: "12px", background: "#1e293b", borderRadius: "8px", borderLeft: "4px solid #10b981" }}>
          <p style={{ fontSize: "0.75em", fontWeight: "bold", textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>Match Explanation</p>
          <p style={{ fontSize: "0.9em", color: "#e2e8f0", whiteSpace: "pre-wrap", margin: 0 }}>{node.meta.explanation}</p>
        </div>
      )}

      <pre className="json-card">{JSON.stringify(node.meta, null, 2)}</pre>
    </section>
  );
}
