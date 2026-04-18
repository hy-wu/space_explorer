import { useWorkspaceStore } from "@/store/workspaceStore";

export function WorkspaceSidebar() {
  const graph = useWorkspaceStore((state) => state.graph);
  const activeFolder = useWorkspaceStore((state) => state.activeFolder);
  const isImportingFolder = useWorkspaceStore((state) => state.isImportingFolder);
  const importError = useWorkspaceStore((state) => state.importError);
  const importFolder = useWorkspaceStore((state) => state.importFolder);

  const counts = graph.nodes.reduce<Record<string, number>>((accumulator, node) => {
    accumulator[node.kind] = (accumulator[node.kind] ?? 0) + 1;
    return accumulator;
  }, {});

  const maxFontSize = useWorkspaceStore((state) => state.maxFontSize);
  const setMaxFontSize = useWorkspaceStore((state) => state.setMaxFontSize);

  return (
    <section className="panel">
      <p className="panel__title">Workspace</p>
      <h2>Unified Graph</h2>
      <p className="muted">
        Tabs, files, code symbols, notes, papers, and answers all live in one graph.
      </p>
      
      <div style={{ margin: "12px 0" }}>
        <label style={{ display: "block", fontSize: "0.85em", color: "#888" }}>
          Max Node Font Size: {maxFontSize}px
        </label>
        <input 
          type="range" 
          min="10" 
          max="150" 
          value={maxFontSize} 
          onChange={(e) => setMaxFontSize(Number(e.target.value))}
          style={{ width: "100%", marginTop: "4px" }}
        />
      </div>

      {isImportingFolder ? "Importing ..." : "Choose "}
      <button type="button" className="import-button" onClick={() => void importFolder()} disabled={isImportingFolder}>
        {"Folder"}
      </button>
      {" or "}
      <button type="button" className="import-button" onClick={() => void importFolder(true)} disabled={isImportingFolder}>
        {"Project"}
      </button>
      <p className="muted">
        {activeFolder ? `Current folder: ${activeFolder.name}` : "No folder connected yet."}
      </p>
      {importError ? <p className="error-text">{importError}</p> : null}
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
