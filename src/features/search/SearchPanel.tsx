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
  const searchSession = useWorkspaceStore((state) => state.searchSession);
  const setSearchSource = useWorkspaceStore((state) => state.setSearchSource);
  const setLocalSearchMode = useWorkspaceStore((state) => state.setLocalSearchMode);
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
        <div className="search-mode-row">
          {localSearchModes.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`mode-chip${activeLocalSearchMode === mode ? " mode-chip--active" : ""}`}
              onClick={() => setLocalSearchMode(mode)}
            >
              {getLocalSearchModeLabel(mode)}
            </button>
          ))}
        </div>
      ) : null}

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