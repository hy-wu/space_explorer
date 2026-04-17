import type { GraphData, GraphEdge, GraphNode } from "@/domain/graph";

export type SearchHistoryEntry = {
  id: string;
  query: string;
  createdAt: string;
  resultCount: number;
};

export type SearchSession = {
  answerNodeId: string | null;
  createdAt: string;
  history: SearchHistoryEntry[];
  query: string;
  queryNodeId: string;
  resultNodeIds: string[];
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

function searchableText(node: GraphNode): string {
  const metaText = Object.values(node.meta)
    .map((value) => String(value))
    .join(" ");

  return [node.title, node.kind, node.tags.join(" "), node.uri ?? "", metaText].join(" ").toLowerCase();
}

function scoreCandidate(node: GraphNode, query: string): CandidateScore | null {
  if (SEARCH_NODE_KINDS.has(node.kind)) {
    return null;
  }

  const text = searchableText(node);
  const terms = toSearchTerms(query);
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
    explanation: `${matchedTerms.length > 0 ? `matched ${matchedTerms.join(", ")}` : "related context"} · ${node.kind} match`,
  };
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

function buildAnswerSummary(query: string, results: CandidateScore[]): string {
  if (results.length === 0) {
    return `No strong matches for "${query}" yet. Try narrower keywords or import a richer workspace.`;
  }

  const topKinds = Array.from(new Set(results.slice(0, 3).map((result) => result.node.kind))).join(", ");
  const topTitles = results
    .slice(0, 2)
    .map((result) => result.node.title)
    .join(" and ");

  return `Top matches cluster around ${topKinds}. Start with ${topTitles} and use nearby similarity links to branch out.`;
}

function similarityWeight(left: CandidateScore, right: CandidateScore): number {
  const overlap = left.matchedTerms.filter((term) => right.matchedTerms.includes(term)).length;
  const tagOverlap = left.node.tags.filter((tag) => right.node.tags.includes(tag)).length;

  return overlap * 0.18 + tagOverlap * 0.08;
}

export function buildInteractiveSearchGraph(
  graph: GraphData,
  query: string,
  history: SearchHistoryEntry[],
): SearchBuildResult {
  const baseGraph = sanitizeBaseGraph(graph);
  const ranked = baseGraph.nodes
    .map((node) => scoreCandidate(node, query))
    .filter((entry): entry is CandidateScore => entry !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  const createdAt = new Date().toISOString();
  const queryNodeId = `search-query:${createdAt}`;
  const queryNode: GraphNode = {
    id: queryNodeId,
    kind: "search_query",
    title: query,
    tags: ["query", "interactive-search"],
    score: 1,
    meta: {
      createdAt,
      resultCount: ranked.length,
      mode: "interactive-search",
    },
  };

  const resultNodes: GraphNode[] = ranked.map((entry, index) => ({
    id: `search-result:${entry.node.id}`,
    kind: "search_result",
    title: entry.node.title,
    tags: [...entry.node.tags, "search-result"],
    score: entry.score,
    meta: {
      explanation: entry.explanation,
      matchedTerms: entry.matchedTerms,
      originalKind: entry.node.kind,
      originalNodeId: entry.node.id,
      rank: index + 1,
    },
  }));

  const answerNodeId = `search-answer:${createdAt}`;
  const answerNode: GraphNode = {
    id: answerNodeId,
    kind: "ai_answer",
    title: "AI synthesis",
    tags: ["answer", "summary"],
    score: ranked[0]?.score ?? 0.5,
    meta: {
      summary: buildAnswerSummary(query, ranked),
      sources: ranked.slice(0, 3).map((entry) => entry.node.title),
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
    query,
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
      query,
      queryNodeId,
      resultNodeIds: resultNodes.map((node) => node.id),
    },
  };
}
