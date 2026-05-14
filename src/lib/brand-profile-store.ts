import fs from "fs";
import path from "path";

export type BrandProfile = {
  mission: string;
  voice: string;
  tone: string;
  targetAudience: string;
  dos: string[];
  donts: string[];
  visualIdentity: string;
};

const START_MARKER = "<!-- BRAND_PROFILE_START -->";
const END_MARKER = "<!-- BRAND_PROFILE_END -->";

function getProfilePath(): string {
  return path.resolve(
    process.cwd(),
    process.env.BRAND_PROFILE_PATH ?? "./CLAUDE.md"
  );
}

function defaultProfile(): BrandProfile {
  return {
    mission: "",
    voice: "",
    tone: "",
    targetAudience: "",
    dos: [],
    donts: [],
    visualIdentity: "",
  };
}

export function getProfile(): BrandProfile {
  const filePath = getProfilePath();

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return defaultProfile();
  }

  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return defaultProfile();
  }

  const jsonStr = content
    .slice(startIdx + START_MARKER.length, endIdx)
    .trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const base = defaultProfile();
    return {
      mission:
        typeof parsed.mission === "string" ? parsed.mission : base.mission,
      voice: typeof parsed.voice === "string" ? parsed.voice : base.voice,
      tone: typeof parsed.tone === "string" ? parsed.tone : base.tone,
      targetAudience:
        typeof parsed.targetAudience === "string"
          ? parsed.targetAudience
          : base.targetAudience,
      dos: Array.isArray(parsed.dos) ? parsed.dos : base.dos,
      donts: Array.isArray(parsed.donts) ? parsed.donts : base.donts,
      visualIdentity:
        typeof parsed.visualIdentity === "string"
          ? parsed.visualIdentity
          : base.visualIdentity,
    };
  } catch {
    return defaultProfile();
  }
}

export function setProfile(fields: Partial<BrandProfile>): void {
  const filePath = getProfilePath();

  const existing = getProfile();
  const updated: BrandProfile = { ...existing, ...fields };

  const block = `${START_MARKER}\n${JSON.stringify(updated)}\n${END_MARKER}`;

  let fileContent: string;
  try {
    fileContent = fs.readFileSync(filePath, "utf-8");
  } catch {
    fileContent = "";
  }

  const startIdx = fileContent.indexOf(START_MARKER);
  const endIdx = fileContent.indexOf(END_MARKER);

  let newContent: string;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Replace the existing block
    newContent =
      fileContent.slice(0, startIdx) +
      block +
      fileContent.slice(endIdx + END_MARKER.length);
  } else {
    // Append the block at the end
    const separator = fileContent.length > 0 && !fileContent.endsWith("\n") ? "\n" : "";
    newContent = fileContent + separator + block + "\n";
  }

  // Ensure parent directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, newContent, "utf-8");
}
