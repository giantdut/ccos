import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getProfile, setProfile } from "../brand-profile-store";

let tmpFile: string;

beforeEach(() => {
  const random = Math.random().toString(36).slice(2);
  tmpFile = path.join(os.tmpdir(), `ccos-test-${random}.md`);
  process.env.BRAND_PROFILE_PATH = tmpFile;
});

afterEach(() => {
  try {
    fs.unlinkSync(tmpFile);
  } catch {
    // already gone
  }
  delete process.env.BRAND_PROFILE_PATH;
});

describe("brand-profile-store", () => {
  it("1. getProfile() on a missing file returns all-empty defaults without throwing", () => {
    const profile = getProfile();
    expect(profile.mission).toBe("");
    expect(profile.voice).toBe("");
    expect(profile.tone).toBe("");
    expect(profile.targetAudience).toBe("");
    expect(profile.dos).toEqual([]);
    expect(profile.donts).toEqual([]);
    expect(profile.visualIdentity).toBe("");
  });

  it("2. setProfile() on a missing file creates the file with the block", () => {
    setProfile({ mission: "Test mission" });
    expect(fs.existsSync(tmpFile)).toBe(true);
    const profile = getProfile();
    expect(profile.mission).toBe("Test mission");
  });

  it("3. Round-trip: setProfile({ mission }) then getProfile() returns correct mission", () => {
    setProfile({ mission: "x" });
    const profile = getProfile();
    expect(profile.mission).toBe("x");
  });

  it("4. Partial updates preserve existing fields", () => {
    setProfile({ mission: "a" });
    setProfile({ voice: "b" });
    const profile = getProfile();
    expect(profile.mission).toBe("a");
    expect(profile.voice).toBe("b");
  });

  it("5. Malformed JSON in block returns all-empty defaults without throwing", () => {
    const content =
      "# Existing content\n<!-- BRAND_PROFILE_START -->\nnot valid json\n<!-- BRAND_PROFILE_END -->\n";
    fs.writeFileSync(tmpFile, content, "utf-8");
    const profile = getProfile();
    expect(profile.mission).toBe("");
    expect(profile.dos).toEqual([]);
  });

  it("6. Existing CLAUDE.md content outside the block is preserved after setProfile", () => {
    const preamble = "# My Existing CLAUDE.md\n\nSome instructions here.\n";
    fs.writeFileSync(tmpFile, preamble, "utf-8");

    setProfile({ mission: "preserve test" });

    const raw = fs.readFileSync(tmpFile, "utf-8");
    expect(raw).toContain("# My Existing CLAUDE.md");
    expect(raw).toContain("Some instructions here.");
    expect(raw).toContain("preserve test");
  });
});
