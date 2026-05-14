import FirecrawlApp from "@mendable/firecrawl-js";

export type WebSource =
  | "youtube"
  | "reddit"
  | "hackernews"
  | "medium"
  | "substack";

export const WEB_SOURCES: WebSource[] = [
  "youtube",
  "reddit",
  "hackernews",
  "medium",
  "substack",
];

export const SOURCE_LABELS: Record<WebSource, string> = {
  youtube: "YouTube",
  reddit: "Reddit",
  hackernews: "Hacker News",
  medium: "Medium",
  substack: "Substack",
};

const SITE_FILTERS: Record<WebSource, string> = {
  youtube: "site:youtube.com",
  reddit: "site:reddit.com",
  hackernews: "site:news.ycombinator.com",
  medium: "site:medium.com",
  substack: "site:substack.com",
};

export type SourceResult = {
  source: WebSource;
  title: string;
  url: string;
  snippet: string;
};

export async function fetchFromSource(
  source: WebSource,
  topic: string
): Promise<SourceResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  try {
    const app = new FirecrawlApp({ apiKey });
    const query = `${topic} ${SITE_FILTERS[source]}`;
    const result = await app.search(query, { limit: 5 });

    if (!result.success || !result.data) return [];

    return result.data.map((item) => ({
      source,
      title: item.title ?? item.url ?? "",
      url: item.url ?? "",
      snippet:
        item.description ??
        (item.markdown ? item.markdown.slice(0, 400) : "") ??
        "",
    }));
  } catch {
    return [];
  }
}
