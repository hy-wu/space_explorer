import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const searchSession = useWorkspaceStore((state) => state.searchSession);
  const runSearch = useWorkspaceStore((state) => state.runSearch);

  return (
    <div className="search-shell">
      <form
        className="searchbar"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(query || "graph IDE");
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this graph: tsx files, graph IDE notes, tutorial clusters..."
        />
        <button type="submit">Search Graph</button>
      </form>
      <p className="search-hint">
        {searchSession
          ? `Active query: ${searchSession.query}`
          : "Query creates a search hub, result nodes, similarity edges, and an AI summary node."}
      </p>
    </div>
  );
}
