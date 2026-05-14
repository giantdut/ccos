import Anthropic from "@anthropic-ai/sdk";
import type { WebSource } from "./web-sources-adapter";
import type { Partition } from "./internal-source-index";

export type ResearchNote = {
  source: WebSource | Partition;
  title: string;
  url?: string;
  content: string;
};

export type ResearchBundle = {
  topic: string;
  summary: string;
  notes: ResearchNote[];
  createdAt: string;
};

type RawWebResult = {
  source: WebSource;
  title: string;
  url: string;
  snippet: string;
};

type RawInternalResult = {
  partition: Partition;
  filename: string;
  snippet: string;
};

export async function synthesizeResearch(
  topic: string,
  webResults: RawWebResult[],
  internalResults: RawInternalResult[]
): Promise<ResearchBundle> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const webSection =
    webResults.length > 0
      ? webResults
          .map(
            (r) =>
              `[${r.source.toUpperCase()}] ${r.title}\n${r.url}\n${r.snippet}`
          )
          .join("\n\n")
      : "No web results found.";

  const internalSection =
    internalResults.length > 0
      ? internalResults
          .map(
            (r) => `[${r.partition.toUpperCase()}] ${r.filename}\n${r.snippet}`
          )
          .join("\n\n")
      : "";

  const prompt = `You are a research analyst. Given these search results about the topic "${topic}", produce a concise research summary.

WEB SOURCES:
${webSection}
${internalSection ? `\nINTERNAL SOURCES:\n${internalSection}` : ""}

Return a JSON object with this exact shape:
{
  "summary": "2-3 paragraph overview of the topic based on the sources",
  "notes": [
    {
      "source": "<source identifier>",
      "title": "<title>",
      "url": "<url or empty string>",
      "content": "Key insight from this result in 1-2 sentences"
    }
  ]
}

Include one note per search result. Use the source identifiers exactly as provided (youtube, reddit, hackernews, medium, substack, knowledge, approved). Return only valid JSON, no markdown fences.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";

  let parsed: { summary?: string; notes?: ResearchNote[] };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    parsed = { summary: text, notes: [] };
  }

  return {
    topic,
    summary: parsed.summary ?? "",
    notes: parsed.notes ?? [],
    createdAt: new Date().toISOString(),
  };
}
