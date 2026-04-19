import { useState } from "react";
import {
  getLocalSearchModeLabel,
  getSearchSourceLabel,
  localSearchModes,
  searchSources,
} from "@/features/search/searchGraph";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const activeSearchSource = useWorkspaceStore((state) => state.activeSearchSource);
  const activeLocalSearchMode = useWorkspaceStore((state) => state.activeLocalSearchMode);
  const searchMaxResults = useWorkspaceStore((state) => state.searchMaxResults);
  const searchSession = useWorkspaceStore((state) => state.searchSession);
  const setSearchSource = useWorkspaceStore((state) => state.setSearchSource);
  const setLocalSearchMode = useWorkspaceStore((state) => state.setLocalSearchMode);
  const setSearchMaxResults = useWorkspaceStore((state) => state.setSearchMaxResults);
  const runSearch = useWorkspaceStore((state) => state.runSearch);

  return (
    <div className="search-shell">
      <div className="search-mode-row">
        {searchSources.map((source) => (
          <button
            key={source}
            type="button"
            className={`mode-chip${activeSearchSource === source ? " mode-chip--active" : ""}`}
            onClick={() => setSearchSource(source)}
          >
            {getSearchSourceLabel(source)}
          </button>
        ))}
      </div>

      {activeSearchSource === "local-files" ? (
        <div className="checkbox-row">
          {localSearchModes.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`submode-chip${activeLocalSearchMode === mode ? " submode-chip--active" : ""}`}
              onClick={() => setLocalSearchMode(mode)}
            >
              {getLocalSearchModeLabel(mode)}
            </button>
          ))}
          <label>Max Results:</label>
          <input
            type="number"
            min="1"
            max="50"
            value={searchMaxResults}
            onChange={(e) => setSearchMaxResults(Number(e.target.value) || 6)}
            className="control-number"
          />
        </div>
      ) : (
        <div className="search-mode-row" style={{ alignItems: "center", padding: "0 4px" }}>
          <label className="control-label">Max Results:</label>
          <input
            type="number"
            min="1"
            max="10"  // OPTIMIZE: I tried for most sources, get not much more than 10 results, maybe other page parameters are needed for more results?
            value={searchMaxResults}
            onChange={(e) => setSearchMaxResults(Number(e.target.value) || 6)}
            className="control-number"
          />
        </div>
      )}

      <form
        className="searchbar"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch({
            source: activeSearchSource,
            mode: activeSearchSource === "local-files" ? activeLocalSearchMode : null,
            query: query || "graph IDE",
          });
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Choose a source first, then search..."
        />
        <button type="submit">Search</button>
      </form>

      <p className="search-hint">
        {searchSession
          ? `Active query: ${searchSession.query} · source: ${getSearchSourceLabel(searchSession.source)}${searchSession.mode ? ` · mode: ${getLocalSearchModeLabel(searchSession.mode)}` : ""}`
          : "Source decides where to search. Local files also lets you choose name, semantic, content, or keywords mode."}
      </p>
    </div>
  );
}