import type { GraphData, GraphEdge, GraphNode } from "@/domain/graph";

export const searchSources = ["local-files", "wikipedia"] as const;
export const localSearchModes = ["name", "semantic", "content", "keywords"] as const;

export type SearchSource = (typeof searchSources)[number];
export type LocalSearchMode = (typeof localSearchModes)[number];

export type SearchHistoryEntry = {
  id: string;
  source: SearchSource;
  mode: LocalSearchMode | null;
  query: string;
  createdAt: string;
  resultCount: number;
};

export type SearchSession = {
  answerNodeId: string | null;
  createdAt: string;
  history: SearchHistoryEntry[];
  source: SearchSource;
  mode: LocalSearchMode | null;
  query: string;
  queryNodeId: string;
  resultNodeIds: string[];
};

export type SearchRequest = {
  source: SearchSource;
  mode: LocalSearchMode | null;
  query: string;
};

export type WebSearchResult = {
  snippet: string;
  title: string;
  url: string;
};

export type SearchGraphDependencies = {
  searchWikipedia: (query: string) => Promise<WebSearchResult[]>;
};

type SearchBuildResult = {
  graph: GraphData;
  session: SearchSession;
};

type CandidateScore = {
  explanation: string;
  matchedTerms: string[];
  node: GraphNode;
  score: number;
};

const SEARCH_NODE_KINDS = new Set<GraphNode["kind"]>(["search_query", "search_result", "ai_answer"]);

function toSearchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

function stringMeta(node: GraphNode, key: string): string {
  const value = node.meta[key];
  return typeof value === "string" ? value : "";
}

function searchableText(node: GraphNode): string {
  const metaText = Object.values(node.meta)
    .map((value) => String(value))
    .join(" ");

  return [node.title, node.kind, node.tags.join(" "), node.uri ?? "", metaText].join(" ").toLowerCase();
}

function semanticScore(node: GraphNode, query: string, terms: string[]): CandidateScore | null {
  const text = searchableText(node);
  const matchedTerms = terms.filter((term) => text.includes(term));
  const title = node.title.toLowerCase();
  const exactTitleMatch = title.includes(query.toLowerCase()) ? 0.42 : 0;
  const titleTermHits = matchedTerms.filter((term) => title.includes(term)).length * 0.2;
  const tagHits = matchedTerms.filter((term) => node.tags.some((tag) => tag.toLowerCase().includes(term))).length * 0.1;
  const coverage = terms.length > 0 ? matchedTerms.length / terms.length : 0;
  const kindBoost =
    node.kind === "file" ? 0.06 : node.kind === "note" ? 0.08 : node.kind === "symbol" ? 0.04 : 0;
  const score = Math.min(0.99, coverage * 0.48 + exactTitleMatch + titleTermHits + tagHits + kindBoost);

  if (score <= 0.08) {
    return null;
  }

  return {
    node,
    score,
    matchedTerms,
    explanation: `${matchedTerms.length > 0 ? `matched ${matchedTerms.join(", ")}` : "related context"} · semantic match`,
  };
}

function fileNameScore(node: GraphNode, query: string, terms: string[]): CandidateScore | null {
  if (node.kind !== "file") {
    return null;
  }

  const title = node.title.toLowerCase();
  const matchedTerms = terms.filter((term) => title.includes(term));
  const exact = title.includes(query.toLowerCase()) ? 0.65 : 0;
  const partial = matchedTerms.length * 0.18;
  const score = Math.min(0.99, exact + partial);

  if (score <= 0.08) {
    return null;
  }

  return {
    node,
    score,
    matchedTerms,
    explanation: `${matchedTerms.length > 0 ? `filename matched ${matchedTerms.join(", ")}` : "filename partial match"} · name search`,
  };
}

function contentScore(node: GraphNode, query: string, terms: string[]): CandidateScore | null {
  const content = stringMeta(node, "content").toLowerCase();
  if (!content) {
    return null;
  }

  const matchedTerms = terms.filter((term) => content.includes(term));
  const exact = content.includes(query.toLowerCase()) ? 0.72 : 0;
  const partial = matchedTerms.length * 0.12;
  const score = Math.min(0.99, exact + partial);

  if (score <= 0.08) {
    return null;
  }

  return {
    node,
    score,
    matchedTerms,
    explanation: `${matchedTerms.length > 0 ? `content matched ${matchedTerms.join(", ")}` : "content match"} · content search`,
  };
}

function keywordContentScore(node: GraphNode, terms: string[]): CandidateScore | null {
  const content = stringMeta(node, "content").toLowerCase();
  if (!content || terms.length === 0) {
    return null;
  }

  const counts = terms.map((term) => content.split(term).length - 1);
  const matchedTerms = terms.filter((_, index) => counts[index] > 0);
  const totalHits = counts.reduce((sum, count) => sum + count, 0);
  const score = Math.min(0.99, totalHits * 0.09 + matchedTerms.length * 0.08);

  if (score <= 0.08) {
    return null;
  }

  return {
    node,
    score,
    matchedTerms,
    explanation: `${matchedTerms.join(", ")} repeated ${totalHits} times · keyword search`,
  };
}

function scoreLocalCandidate(node: GraphNode, request: SearchRequest): CandidateScore | null {
  if (SEARCH_NODE_KINDS.has(node.kind) || request.source !== "local-files") {
    return null;
  }

  const terms = toSearchTerms(request.query);
  switch (request.mode) {
    case "name":
      return fileNameScore(node, request.query, terms);
    case "content":
      return contentScore(node, request.query, terms);
    case "keywords":
      return keywordContentScore(node, terms);
    case "semantic":
    default:
      return semanticScore(node, request.query, terms);
  }
}

function sanitizeBaseGraph(graph: GraphData): GraphData {
  const searchNodeIds = new Set(
    graph.nodes.filter((node) => SEARCH_NODE_KINDS.has(node.kind)).map((node) => node.id),
  );

  return {
    nodes: graph.nodes.filter((node) => !SEARCH_NODE_KINDS.has(node.kind)),
    edges: graph.edges.filter(
      (edge) => !searchNodeIds.has(edge.source) && !searchNodeIds.has(edge.target),
    ),
  };
}

function placeSearchNodes(baseGraph: GraphData, searchNodes: GraphNode[]): GraphNode[] {
  const queryNode = searchNodes.find((node) => node.kind === "search_query");
  if (!queryNode) {
    return searchNodes;
  }

  const candidates = searchNodes.filter((node) => node.id !== queryNode.id);
  const baseWidth = Math.max(baseGraph.nodes.length, 1) * 12;
  const anchorX = baseWidth + 260;
  const anchorY = -40;

  return searchNodes.map((node) => {
    if (node.id === queryNode.id) {
      return {
        ...node,
        position: { x: anchorX, y: anchorY, z: 0 },
      };
    }

    const index = candidates.findIndex((candidate) => candidate.id === node.id);
    const ring = 100 + index * 30 - (node.score ?? 0) * 50;
    const angle = (index / Math.max(candidates.length, 1)) * Math.PI * 2;
    const vertical = node.kind === "ai_answer" ? -110 : ((index % 3) - 1) * 60;

    return {
      ...node,
      position: {
        x: anchorX + Math.cos(angle) * ring,
        y: anchorY + vertical,
        z: Math.sin(angle) * ring,
      },
    };
  });
}

function sourceLabel(source: SearchSource): string {
  return source === "local-files" ? "local files" : "Wikipedia";
}

function modeLabel(mode: LocalSearchMode | null): string {
  if (!mode) {
    return "";
  }
  switch (mode) {
    case "name":
      return "name";
    case "semantic":
      return "semantic";
    case "content":
      return "content";
    case "keywords":
      return "keywords";
  }
}

function buildLocalAnswerSummary(request: SearchRequest, results: CandidateScore[]): string {
  if (results.length === 0) {
    return `No strong ${modeLabel(request.mode)} matches for "${request.query}" in local files yet.`;
  }

  const topKinds = Array.from(new Set(results.slice(0, 3).map((result) => result.node.kind))).join(", ");
  const topTitles = results
    .slice(0, 2)
    .map((result) => result.node.title)
    .join(" and ");

  return `Top ${modeLabel(request.mode)} matches in local files cluster around ${topKinds}. Start with ${topTitles}.`;
}

function similarityWeight(left: CandidateScore, right: CandidateScore): number {
  const overlap = left.matchedTerms.filter((term) => right.matchedTerms.includes(term)).length;
  const tagOverlap = left.node.tags.filter((tag) => right.node.tags.includes(tag)).length;
  return overlap * 0.18 + tagOverlap * 0.08;
}

function createLocalSearchGraph(
  graph: GraphData,
  request: SearchRequest,
  history: SearchHistoryEntry[],
): SearchBuildResult {
  const baseGraph = sanitizeBaseGraph(graph);
  const ranked = baseGraph.nodes
    .map((node) => scoreLocalCandidate(node, request))
    .filter((entry): entry is CandidateScore => entry !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  const createdAt = new Date().toISOString();
  const queryNodeId = `search-query:${createdAt}`;
  const queryNode: GraphNode = {
    id: queryNodeId,
    kind: "search_query",
    title: request.query,
    tags: ["query", "interactive-search", request.source, request.mode ?? "semantic"],
    score: 1,
    meta: {
      createdAt,
      resultCount: ranked.length,
      source: request.source,
      mode: request.mode,
    },
  };

  const resultNodes: GraphNode[] = ranked.map((entry, index) => ({
    id: `search-result:${request.source}:${request.mode}:${entry.node.id}`,
    kind: "search_result",
    title: entry.node.title,
    tags: [...entry.node.tags, "search-result", request.source],
    score: entry.score,
    meta: {
      explanation: entry.explanation,
      matchedTerms: entry.matchedTerms,
      originalKind: entry.node.kind,
      originalNodeId: entry.node.id,
      rank: index + 1,
      source: request.source,
      mode: request.mode,
    },
  }));

  const answerNodeId = `search-answer:${createdAt}`;
  const answerNode: GraphNode = {
    id: answerNodeId,
    kind: "ai_answer",
    title: "AI synthesis",
    tags: ["answer", "summary", request.source],
    score: ranked[0]?.score ?? 0.5,
    meta: {
      summary: buildLocalAnswerSummary(request, ranked),
      sources: ranked.slice(0, 3).map((entry) => entry.node.title),
      source: request.source,
      mode: request.mode,
    },
  };

  const searchNodes = placeSearchNodes(baseGraph, [queryNode, ...resultNodes, answerNode]);

  const searchEdges: GraphEdge[] = [
    ...resultNodes.map((node, index) => ({
      id: `edge-query-result:${node.id}`,
      source: queryNodeId,
      target: node.id,
      kind: "related_to" as const,
      weight: ranked[index]?.score ?? 0.2,
      meta: {
        matchedTerms: node.meta.matchedTerms,
      },
    })),
    ...resultNodes.map((node) => ({
      id: `edge-result-origin:${node.id}`,
      source: node.id,
      target: String(node.meta.originalNodeId),
      kind: "generated_from" as const,
      weight: node.score ?? 0.2,
      meta: {},
    })),
    {
      id: `edge-query-answer:${answerNodeId}`,
      source: queryNodeId,
      target: answerNodeId,
      kind: "answers" as const,
      weight: 1,
      meta: {},
    },
  ];

  for (let index = 0; index < ranked.length; index += 1) {
    for (let inner = index + 1; inner < ranked.length; inner += 1) {
      const weight = similarityWeight(ranked[index], ranked[inner]);
      if (weight < 0.16) {
        continue;
      }

      searchEdges.push({
        id: `edge-similarity:${resultNodes[index].id}:${resultNodes[inner].id}`,
        source: resultNodes[index].id,
        target: resultNodes[inner].id,
        kind: "similar_to",
        weight,
        meta: {},
      });
    }
  }

  const nextHistoryEntry: SearchHistoryEntry = {
    id: queryNodeId,
    query: request.query,
    source: request.source,
    mode: request.mode,
    createdAt,
    resultCount: ranked.length,
  };

  return {
    graph: {
      nodes: [...baseGraph.nodes, ...searchNodes],
      edges: [...baseGraph.edges, ...searchEdges],
    },
    session: {
      answerNodeId,
      createdAt,
      history: [nextHistoryEntry, ...history].slice(0, 8),
      source: request.source,
      mode: request.mode,
      query: request.query,
      queryNodeId,
      resultNodeIds: resultNodes.map((node) => node.id),
    },
  };
}

function createWikipediaSearchGraph(
  graph: GraphData,
  request: SearchRequest,
  history: SearchHistoryEntry[],
  results: WebSearchResult[],
): SearchBuildResult {
  const baseGraph = sanitizeBaseGraph(graph);
  const createdAt = new Date().toISOString();
  const queryNodeId = `search-query:${createdAt}`;

  const queryNode: GraphNode = {
    id: queryNodeId,
    kind: "search_query",
    title: request.query,
    tags: ["query", "interactive-search", request.source],
    score: 1,
    meta: {
      createdAt,
      resultCount: results.length,
      source: request.source,
      mode: null,
    },
  };

  const resultNodes: GraphNode[] = results.slice(0, 6).map((result, index) => ({
    id: `search-result:wikipedia:${index}:${createdAt}`,
    kind: "search_result",
    title: result.title,
    uri: result.url,
    tags: ["wikipedia", "web", "search-result"],
    score: Math.max(0.35, 0.92 - index * 0.08),
    meta: {
      explanation: result.snippet,
      originalKind: "wikipedia_result",
      originalNodeId: result.url,
      rank: index + 1,
      source: request.source,
      mode: null,
      snippet: result.snippet,
      url: result.url,
    },
  }));

  const answerNodeId = `search-answer:${createdAt}`;
  const answerNode: GraphNode = {
    id: answerNodeId,
    kind: "ai_answer",
    title: "Wikipedia synthesis",
    tags: ["answer", "summary", request.source],
    score: resultNodes[0]?.score ?? 0.5,
    meta: {
      summary:
        resultNodes.length > 0
          ? `Wikipedia search found ${resultNodes.length} results for "${request.query}". Start from the closest nodes and inspect their snippets.`
          : `Wikipedia search returned no results for "${request.query}".`,
      source: request.source,
      mode: null,
    },
  };

  const searchNodes = placeSearchNodes(baseGraph, [queryNode, ...resultNodes, answerNode]);
  const searchEdges: GraphEdge[] = [
    ...resultNodes.map((node) => ({
      id: `edge-query-result:${node.id}`,
      source: queryNodeId,
      target: node.id,
      kind: "related_to" as const,
      weight: node.score ?? 0.2,
      meta: {},
    })),
    {
      id: `edge-query-answer:${answerNodeId}`,
      source: queryNodeId,
      target: answerNodeId,
      kind: "answers" as const,
      weight: 1,
      meta: {},
    },
  ];

  const nextHistoryEntry: SearchHistoryEntry = {
    id: queryNodeId,
    query: request.query,
    source: request.source,
    mode: null,
    createdAt,
    resultCount: resultNodes.length,
  };

  return {
    graph: {
      nodes: [...baseGraph.nodes, ...searchNodes],
      edges: [...baseGraph.edges, ...searchEdges],
    },
    session: {
      answerNodeId,
      createdAt,
      history: [nextHistoryEntry, ...history].slice(0, 8),
      source: request.source,
      mode: null,
      query: request.query,
      queryNodeId,
      resultNodeIds: resultNodes.map((node) => node.id),
    },
  };
}

export async function buildInteractiveSearchGraph(
  graph: GraphData,
  request: SearchRequest,
  history: SearchHistoryEntry[],
  dependencies: SearchGraphDependencies,
): Promise<SearchBuildResult> {
  if (request.source === "wikipedia") {
    const results = await dependencies.searchWikipedia(request.query);
    return createWikipediaSearchGraph(graph, request, history, results);
  }

  return createLocalSearchGraph(
    graph,
    {
      ...request,
      mode: request.mode ?? "semantic",
    },
    history,
  );
}

export function getSearchSourceLabel(source: SearchSource): string {
  return sourceLabel(source);
}

export function getLocalSearchModeLabel(mode: LocalSearchMode | null): string {
  return modeLabel(mode);
}
