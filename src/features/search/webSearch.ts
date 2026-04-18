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

export async function searchArXiv(query: string): Promise<WebSearchResult[]> {
  const url = new URL("https://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `all:${query}`);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", "6");

  // alert(`ArXiv API request URL: ${url.toString()}`);

  // OPTIMIZE: using CORS proxy to avoid CORS issues in the browser; in production, consider implementing a backend proxy for better reliability and security
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url.toString())}`;
  const response = await fetch(proxyUrl);

  // alert(`ArXiv API response status: ${response.status}`);

  if (!response.ok) {
    throw new Error(`ArXiv search failed with status ${response.status}.`);
  }

  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const entries = xmlDoc.getElementsByTagName("entry");

  const results: WebSearchResult[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() ?? "No title";
    const snippet = entry.getElementsByTagName("summary")[0]?.textContent?.trim()?.slice(0, 300) ?? "No summary";
    const link = entry.getElementsByTagName("id")[0]?.textContent?.trim() ?? "";
    results.push({ title, snippet, url: link });
  }

  return results;
}

export async function searchDuckDuckGo(query: string): Promise<WebSearchResult[]> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  alert(url.toString());
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed with status ${response.status}.`);
  }

  const data = await response.json();
  const results: WebSearchResult[] = [];

  alert(JSON.stringify(data, null, 2));

  if (data.AbstractText) {
    results.push({
      title: data.Heading || query,
      snippet: data.AbstractText,
      url: data.AbstractURL || "",
    });
  }

  const processTopic = (topic: any) => {
    if (results.length >= 10) return;
    if (topic.Text && topic.FirstURL) {
      results.push({
        title: topic.FirstURL.split("/").pop()?.replace(/_/g, " ") || topic.Text.slice(0, 40),
        snippet: topic.Text,
        url: topic.FirstURL,
      });
    }
    if (topic.Topics && Array.isArray(topic.Topics)) {
      topic.Topics.forEach(processTopic);
    }
  };

  if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
    data.RelatedTopics.forEach(processTopic);
  }

  return results;
}

export async function searchSearXNG(query: string): Promise<WebSearchResult[]> {
  // Using a popular public instance. In production, users might want to configure their own.
  const url = new URL("https://searx.be/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("categories", "general");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`SearXNG search failed with status ${response.status}.`);
  }

  const data = await response.json();
  return (data.results || []).slice(0, 6).map((res: any) => ({
    title: res.title || "No title",
    snippet: res.content || res.snippet || "No snippet",
    url: res.url || "",
  }));
}

export async function searchHackerNews(query: string): Promise<WebSearchResult[]> {
  const url = new URL("https://hn.algolia.com/api/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("tags", "story");
  url.searchParams.set("hitsPerPage", "6");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Hacker News search failed with status ${response.status}.`);
  }

  const data = await response.json();
  return (data.hits || []).map((hit: any) => ({
    title: hit.title || "No title",
    snippet: `${hit.points || 0} points by ${hit.author} | ${hit.num_comments || 0} comments`,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
  }));
}

export async function searchSemanticScholar(query: string): Promise<WebSearchResult[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("fields", "title,authors,year,abstract,url");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Semantic Scholar search failed with status ${response.status}.`);
  }

  const data = await response.json();
  return (data.data || []).map((paper: any) => ({
    title: paper.title || "No title",
    snippet: `${paper.year || "Unknown year"} · ${paper.authors?.map((a: any) => a.name).join(", ") || "Unknown authors"} · ${paper.abstract?.slice(0, 200) || "No abstract..."}`,
    url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
  }));
}

export async function searchGoogleBooks(query: string): Promise<WebSearchResult[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "6");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google Books search failed with status ${response.status}.`);
  }

  const data = await response.json();
  return (data.items || []).map((item: any) => ({
    title: item.volumeInfo.title || "No title",
    snippet: `${item.volumeInfo.authors?.join(", ") || "Unknown author"} · ${item.volumeInfo.publisher || "Unknown publisher"} (${item.volumeInfo.publishedDate || "N/A"}) · ${item.volumeInfo.description?.slice(0, 150) || "No description"}`,
    url: item.volumeInfo.infoLink || "",
  }));
}

export async function searchOpenAlex(query: string): Promise<WebSearchResult[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", "6");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OpenAlex search failed with status ${response.status}.`);
  }

  const data = await response.json();
  return (data.results || []).map((work: any) => ({
    title: work.display_name || "No title",
    snippet: `Published in ${work.publication_year || "Unknown year"} · ${work.authorships?.map((a: any) => a.author.display_name).join(", ") || "Unknown authors"}`,
    url: work.doi || work.id || "",
  }));
}

export async function searchCrossref(query: string): Promise<WebSearchResult[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query", query);
  url.searchParams.set("rows", "6");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Crossref search failed with status ${response.status}.`);
  }

  const data = await response.json();
  return (data.message.items || []).map((item: any) => ({
    title: item.title?.[0] || "No title",
    snippet: `${item.publisher} · ${item.container_title?.[0] || ""} (${item.created?.["date-parts"]?.[0]?.[0] || "Unknown year"})`,
    url: item.URL || "",
  }));
}