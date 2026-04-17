import { useMemo } from "react";
import {
  getLocalSearchModeLabel,
  getSearchSourceLabel,
} from "@/features/search/searchGraph";
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
            {resultNodes.length} results projected into the graph. Source: {getSearchSourceLabel(searchSession.source)}
            {searchSession.mode ? ` · Mode: ${getLocalSearchModeLabel(searchSession.mode)}` : ""}
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
          Choose a source first. Local files supports modes. Wikipedia uses its own source-specific search flow.
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
                onClick={() =>
                  void runSearch({
                    source: entry.source,
                    mode: entry.mode,
                    query: entry.query,
                  })
                }
              >
                <span>{entry.query}</span>
                <em>{getSearchSourceLabel(entry.source)}</em>
                {entry.mode ? <em>{getLocalSearchModeLabel(entry.mode)}</em> : null}
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