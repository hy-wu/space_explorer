import type { GraphNode } from "@/domain/graph";

export type SearchHit = {
  id: string;
  title: string;
  score: number;
  snippet?: string;
  sourceKind: "file" | "note" | "paper" | "tutorial" | "web";
};

export type SearchAnswer = {
  title: string;
  summary: string;
};

export interface AiAdapter {
  search(query: string): Promise<SearchHit[]>;
  answer(query: string, context: SearchHit[]): Promise<SearchAnswer | null>;
  embed?(items: GraphNode[]): Promise<Array<{ id: string; vector: number[] }>>;
}
