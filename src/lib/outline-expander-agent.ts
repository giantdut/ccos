import Anthropic from "@anthropic-ai/sdk";
import type { BrandProfile } from "./brand-profile-store";

export async function expandOutline(
  title: string,
  outline: string,
  brand: BrandProfile
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const brandLines = [
    brand.mission && `Mission: ${brand.mission}`,
    brand.voice && `Voice: ${brand.voice}`,
    brand.tone && `Tone: ${brand.tone}`,
    brand.targetAudience && `Target audience: ${brand.targetAudience}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a content strategist. Given a content piece's working title and a bullet-point outline, expand it into a detailed structural plan.

Title: ${title}

Outline:
${outline}
${brandLines ? `\nBrand context:\n${brandLines}\n` : ""}
Produce a detailed structural plan that includes:
- An introduction approach
- 3–6 main sections with sub-points
- A conclusion approach
- Angles and emphasis to highlight

Use markdown headers (##) and bullet points. No preamble.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}
