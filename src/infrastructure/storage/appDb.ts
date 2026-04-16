import Dexie, { type Table } from "dexie";
import type { GraphEdge, GraphNode } from "@/domain/graph";

export type LayoutRecord = {
  nodeId: string;
  x: number;
  y: number;
  z: number;
  updatedAt: string;
};

class AppDb extends Dexie {
  nodes!: Table<GraphNode, string>;
  edges!: Table<GraphEdge, string>;
  layouts!: Table<LayoutRecord, string>;

  constructor() {
    super("graph-workspace");
    this.version(1).stores({
      nodes: "id, kind, title",
      edges: "id, source, target, kind",
      layouts: "nodeId, updatedAt",
    });
  }
}

export const appDb = new AppDb();
