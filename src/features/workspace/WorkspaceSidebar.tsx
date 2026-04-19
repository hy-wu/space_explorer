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

  const edgeCounts = graph.edges.reduce<Record<string, number>>((accumulator, edge) => {
    accumulator[edge.kind] = (accumulator[edge.kind] ?? 0) + 1;
    return accumulator;
  }, {});

  const maxFontSize = useWorkspaceStore((state) => state.maxFontSize);
  const setMaxFontSize = useWorkspaceStore((state) => state.setMaxFontSize);
  const shouldParsePdf = useWorkspaceStore((state) => state.shouldParsePdf);
  const setShouldParsePdf = useWorkspaceStore((state) => state.setShouldParsePdf);

  return (
    <section className="panel">
      <p className="panel__title">Workspace</p>
      <h2>Unified Graph</h2>
      <p className="muted">
        Tabs, files, code symbols, notes, papers, and answers all live in one graph.
      </p>
      
      <div className="control-group">
        <div>
          <div className="search-mode-row">
          <label className="control-label">
            Max Node Font Size:
          </label>
          <label>{maxFontSize} px</label>
          </div>
          <input 
            type="range" 
            min="10" 
            max="150" 
            value={maxFontSize} 
            onChange={(e) => setMaxFontSize(Number(e.target.value))}
            className="control-range"
          />
        </div>

        <label className="checkbox-row">
          <input 
            type="checkbox" 
            checked={shouldParsePdf}
            onChange={(e) => setShouldParsePdf(e.target.checked)}
          />
          <span>Extract PDF Content (Slow)</span>
        </label>
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
      
      <div style={{ marginTop: "16px" }}>
        <p style={{ fontSize: "0.75em", fontWeight: "bold", textTransform: "uppercase", color: "#555", marginBottom: "8px" }}>Entities</p>
        <ul className="kind-list">
          {Object.entries(counts).map(([kind, count]) => (
            <li key={kind}>
              <span>{kind}</span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: "16px" }}>
        <p style={{ fontSize: "0.75em", fontWeight: "bold", textTransform: "uppercase", color: "#555", marginBottom: "8px" }}>Relationships</p>
        <ul className="kind-list">
          {Object.entries(edgeCounts).map(([kind, count]) => (
            <li key={kind}>
              <span style={{ color: kind === "references" ? "#10b981" : kind === "defines" ? "#8b5cf6" : kind === "imports"? "#ec4899" : "inherit" }}>{kind}</span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
