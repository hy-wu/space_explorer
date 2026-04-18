import { z } from "zod";

export const entityKinds = [
  "workspace",
  "folder",
  "file",
  "tab",
  "note",
  "paper",
  "tutorial",
  "symbol",
  "search_query",
  "local_search_result",
  "web_search_result",
  "ai_answer",
] as const;

export const relationKinds = [
  "contains",
  "references",
  "imports",
  "similar_to",
  "related_to",
  "opened_with",
  "generated_from",
  "answers",
] as const;

export type EntityKind = (typeof entityKinds)[number];
export type RelationKind = (typeof relationKinds)[number];

export const graphNodeSchema = z.object({
  id: z.string(),
  kind: z.enum(entityKinds),
  title: z.string(),
  uri: z.string().optional(),
  tags: z.array(z.string()),
  score: z.number().optional(),
  pinned: z.boolean().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional(),
  meta: z.record(z.string(), z.unknown()),
});

export const graphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: z.enum(relationKinds),
  weight: z.number().optional(),
  directed: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()),
});

export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
