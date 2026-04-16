import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const runDemoSearch = useWorkspaceStore((state) => state.runDemoSearch);

  return (
    <form
      className="searchbar"
      onSubmit={(event) => {
        event.preventDefault();
        runDemoSearch(query || "graph IDE");
      }}
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Visualize a query like: graph IDE, RAG tutorial, paper cluster..."
      />
      <button type="submit">Map Search</button>
    </form>
  );
}
