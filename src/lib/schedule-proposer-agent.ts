import Anthropic from "@anthropic-ai/sdk";
import type { ResearchBundle } from "./researcher-agent";

export type ProposedScheduleItem = {
  title: string;
  publishDate: string;
  outline: string;
};

export async function proposeScheduleItems(
  bundle: ResearchBundle,
  count = 5
): Promise<ProposedScheduleItem[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const today = new Date().toISOString().split("T")[0];
  const noteSample = bundle.notes
    .slice(0, 10)
    .map((n) => `- ${n.title}: ${n.content}`)
    .join("\n");

  const prompt = `You are a content strategist. Based on this research bundle about "${bundle.topic}", propose ${count} content pieces for a publishing schedule.

Research Summary:
${bundle.summary}

Key Notes:
${noteSample}

Today's date: ${today}

Propose ${count} content pieces starting from next week, spaced roughly one week apart.

Return a JSON array with this exact shape:
[
  {
    "title": "Working title for the piece",
    "publishDate": "YYYY-MM-DD",
    "outline": "• Key point 1\\n• Key point 2\\n• Key point 3"
  }
]

Each outline should be 3–5 bullet points describing the angle and key coverage. Return only valid JSON, no markdown fences.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "[]";

  let parsed: ProposedScheduleItem[];
  try {
    parsed = JSON.parse(text) as ProposedScheduleItem[];
    if (!Array.isArray(parsed)) parsed = [];
  } catch {
    parsed = [];
  }

  return parsed;
}
