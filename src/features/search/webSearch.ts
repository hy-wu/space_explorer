import type { WebSearchResult } from "@/features/search/searchGraph";

type WikipediaSearchResponse = [string, string[], string[], string[]];

export async function searchWikipedia(query: string): Promise<WebSearchResult[]> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "opensearch");
  url.searchParams.set("search", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("namespace", "0");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Network search failed with status ${response.status}.`);
  }

  const data = (await response.json()) as WikipediaSearchResponse;
  const titles = data[1] ?? [];
  const snippets = data[2] ?? [];
  const urls = data[3] ?? [];

  return titles.map((title, index) => ({
    title,
    snippet: snippets[index] ?? "Wikipedia result",
    url: urls[index] ?? "",
  }));
}