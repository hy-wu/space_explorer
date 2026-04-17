import { useMemo } from "react";
import { getNodeDisplayTitle } from "@/features/workspace/nodeDisplay";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function SearchResultsPanel() {
  const graph = useWorkspaceStore((state) => state.graph);
  const searchSession = useWorkspaceStore((state) => state.searchSession);
  const searchHistory = useWorkspaceStore((state) => state.searchHistory);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const runSearch = useWorkspaceStore((state) => state.runSearch);
  const clearSearch = useWorkspaceStore((state) => state.clearSearch);

  const resultNodes = useMemo(
    () =>
      searchSession
        ? searchSession.resultNodeIds
            .map((id) => graph.nodes.find((node) => node.id === id) ?? null)
            .filter((node): node is NonNullable<typeof node> => node !== null)
        : [],
    [graph.nodes, searchSession],
  );

  const answerNode = useMemo(
    () =>
      searchSession?.answerNodeId
        ? graph.nodes.find((node) => node.id === searchSession.answerNodeId) ?? null
        : null,
    [graph.nodes, searchSession],
  );

  return (
    <section className="panel">
      <div className="panel__row">
        <p className="panel__title">Search Graph</p>
        {searchSession ? (
          <button className="ghost-button" type="button" onClick={clearSearch}>
            Clear
          </button>
        ) : null}
      </div>

      {searchSession ? (
        <>
          <h2>{searchSession.query}</h2>
          <p className="muted">
            {resultNodes.length} results projected into the graph. Click a result card to inspect its node.
          </p>
          {answerNode ? (
            <article className="search-answer-card">
              <strong>{getNodeDisplayTitle(answerNode)}</strong>
              <p>{String(answerNode.meta.summary ?? "")}</p>
            </article>
          ) : null}
          <div className="search-results">
            {resultNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={`search-result-card${selectedNodeId === node.id ? " search-result-card--active" : ""}`}
                onClick={() => selectNode(node.id)}
              >
                <span className="search-result-card__title">{getNodeDisplayTitle(node)}</span>
                <span className="search-result-card__meta">
                  {String(node.meta.originalKind ?? "unknown")} · score {(node.score ?? 0).toFixed(2)}
                </span>
                <span className="search-result-card__body">{String(node.meta.explanation ?? "")}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">
          Search your current graph to create a query hub, similarity links, and an AI summary node.
        </p>
      )}

      <div className="history-block">
        <p className="panel__title">History</p>
        <div className="history-list">
          {searchHistory.length > 0 ? (
            searchHistory.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="history-chip"
                onClick={() => runSearch(entry.query)}
              >
                <span>{entry.query}</span>
                <strong>{entry.resultCount}</strong>
              </button>
            ))
          ) : (
            <p className="muted">No searches yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
