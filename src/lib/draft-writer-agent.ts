import Anthropic from "@anthropic-ai/sdk";
import type { BrandProfile } from "./brand-profile-store";

export async function writeDraft(
  title: string,
  expandedOutline: string,
  brand: BrandProfile
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const brandLines = [
    brand.mission && `Mission: ${brand.mission}`,
    brand.voice && `Voice: ${brand.voice}`,
    brand.tone && `Tone: ${brand.tone}`,
    brand.targetAudience && `Target audience: ${brand.targetAudience}`,
    brand.dos.length > 0 && `Do: ${brand.dos.join(", ")}`,
    brand.donts.length > 0 && `Don't: ${brand.donts.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a professional content writer. Write a complete draft for the following piece.

Title: ${title}

Structural plan:
${expandedOutline}
${brandLines ? `\nBrand guidelines:\n${brandLines}\n` : ""}
Write the full draft now. Use markdown formatting (headers, bullets where appropriate). Follow the structural plan closely and write in the brand's voice and tone.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}
