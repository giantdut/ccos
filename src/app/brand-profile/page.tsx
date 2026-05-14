"use client";

import { useEffect, useState } from "react";

type BrandProfile = {
  mission: string;
  voice: string;
  tone: string;
  targetAudience: string;
  dos: string[];
  donts: string[];
  visualIdentity: string;
};

const emptyProfile = (): BrandProfile => ({
  mission: "",
  voice: "",
  tone: "",
  targetAudience: "",
  dos: [],
  donts: [],
  visualIdentity: "",
});

export default function BrandProfilePage() {
  const [profile, setProfile] = useState<BrandProfile>(emptyProfile());
  const [dosText, setDosText] = useState("");
  const [dontsText, setDontsText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/api/brand-profile")
      .then((res) => res.json())
      .then((data: BrandProfile) => {
        setProfile(data);
        setDosText((data.dos ?? []).join("\n"));
        setDontsText((data.donts ?? []).join("\n"));
      })
      .catch(() => {
        // Gracefully handle missing/empty file — leave defaults
      });
  }, []);

  function handleChange(field: keyof Omit<BrandProfile, "dos" | "donts">, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    const payload: BrandProfile = {
      ...profile,
      dos: dosText.split("\n").map((s) => s.trim()).filter(Boolean),
      donts: dontsText.split("\n").map((s) => s.trim()).filter(Boolean),
    };

    try {
      const res = await fetch("/api/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const updated: BrandProfile = await res.json();
      setProfile(updated);
      setDosText((updated.dos ?? []).join("\n"));
      setDontsText((updated.donts ?? []).join("\n"));
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const textareaClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Brand Profile</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Mission
          </label>
          <textarea
            className={textareaClass}
            rows={3}
            value={profile.mission}
            onChange={(e) => handleChange("mission", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Voice
          </label>
          <textarea
            className={textareaClass}
            rows={3}
            value={profile.voice}
            onChange={(e) => handleChange("voice", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tone
          </label>
          <textarea
            className={textareaClass}
            rows={3}
            value={profile.tone}
            onChange={(e) => handleChange("tone", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Target Audience
          </label>
          <textarea
            className={textareaClass}
            rows={3}
            value={profile.targetAudience}
            onChange={(e) => handleChange("targetAudience", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Visual Identity
          </label>
          <textarea
            className={textareaClass}
            rows={3}
            value={profile.visualIdentity}
            onChange={(e) => handleChange("visualIdentity", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Do&apos;s{" "}
            <span className="font-normal text-gray-500">(one per line)</span>
          </label>
          <textarea
            className={textareaClass}
            rows={4}
            value={dosText}
            onChange={(e) => setDosText(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Don&apos;ts{" "}
            <span className="font-normal text-gray-500">(one per line)</span>
          </label>
          <textarea
            className={textareaClass}
            rows={4}
            value={dontsText}
            onChange={(e) => setDontsText(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>

          {status === "success" && (
            <p className="text-sm text-green-600">Profile saved successfully.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600">
              Failed to save: {errorMessage}
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
