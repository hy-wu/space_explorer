import { useWorkspaceStore } from "@/store/workspaceStore";

export function WorkspaceSidebar() {
  const graph = useWorkspaceStore((state) => state.graph);

  const counts = graph.nodes.reduce<Record<string, number>>((accumulator, node) => {
    accumulator[node.kind] = (accumulator[node.kind] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <section className="panel">
      <p className="panel__title">Workspace</p>
      <h2>Unified Graph</h2>
      <p className="muted">
        Tabs, files, code symbols, notes, papers, and answers all live in one graph.
      </p>
      <div className="stat-grid">
        <div>
          <span>Nodes</span>
          <strong>{graph.nodes.length}</strong>
        </div>
        <div>
          <span>Edges</span>
          <strong>{graph.edges.length}</strong>
        </div>
      </div>
      <ul className="kind-list">
        {Object.entries(counts).map(([kind, count]) => (
          <li key={kind}>
            <span>{kind}</span>
            <strong>{count}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
