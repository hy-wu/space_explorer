import type { GraphNode } from "@/domain/graph";
import { ca } from "zod/v4/locales";

function fileIcon(extension: string | undefined): string {
  switch ((extension ?? "").toLowerCase()) {
    case "pdf":
      return "📕";
    case "tex":
      return "📐";
    case "ts":
    case "tsx":
      return "🔷";
    case "js":
    case "jsx":
      return "🟨";
    case "json":
      return "🧩";
    case "md":
      return "📝";
    case "css":
      return "🎨";
    case "html":
      return "🌐";
    default:
      return "📄";
  }
}

export function getNodeIcon(node: GraphNode): string {
  switch (node.kind) {
    case "workspace":
      return "🪐";
    case "folder":
      return "📁";
    case "file":
      return fileIcon(typeof node.meta.extension === "string" ? node.meta.extension : undefined);
    case "note":
      return "📝";
    case "paper":
      return "📚";
    case "tutorial":
      return "🎓";
    case "symbol":
      return "🔹";
    case "search_query":
      return "🔍";
    case "local_search_result":
      return "🧠";
    case "web_search_result":
      return "🌐";
    case "ai_answer":
      return "✨";
    case "tab":
      return "🗂";
    default:
      return "•";
  }
}

export function getNodeDisplayTitle(node: GraphNode): string {
  return `${getNodeIcon(node)} ${node.title}`;
}
