"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type ResearchNote = {
  source: string;
  title: string;
  url?: string;
  content: string;
};

type ResearchBundle = {
  topic: string;
  summary: string;
  notes: ResearchNote[];
  createdAt: string;
};

type ExistingSchedule = {
  id: string;
  status: string;
  createdAt: string;
};

const SOURCE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  reddit: "Reddit",
  hackernews: "Hacker News",
  medium: "Medium",
  substack: "Substack",
  knowledge: "Knowledge Upload",
  approved: "Approved Content",
};

export default function ResearchBundlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bundle, setBundle] = useState<ResearchBundle | null>(null);
  const [error, setError] = useState(false);

  const [showPropose, setShowPropose] = useState(false);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);
  const [proposeTarget, setProposeTarget] = useState<"new" | string>("new");
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/research-bundles/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => setBundle(data as ResearchBundle))
      .catch(() => setError(true));
  }, [id]);

  function openPropose() {
    fetch("/api/content-schedules")
      .then((r) => r.json())
      .then((data) => {
        const proposed = (data as ExistingSchedule[]).filter(
          (s) => s.status === "proposed"
        );
        setExistingSchedules(proposed);
      })
      .catch(() => {});
    setShowPropose(true);
    setProposeTarget("new");
    setProposeError(null);
  }

  async function handlePropose() {
    setProposing(true);
    setProposeError(null);
    try {
      const body: { bundleSessionId: string; existingScheduleId?: string } = {
        bundleSessionId: id,
      };
      if (proposeTarget !== "new") body.existingScheduleId = proposeTarget;

      const res = await fetch("/api/content-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setProposeError(err.error ?? "Failed to start proposal");
        setProposing(false);
        return;
      }

      const { scheduleId, jobId } = await res.json() as {
        scheduleId: string;
        jobId: string;
      };
      router.push(`/content-schedules/${scheduleId}?jobId=${jobId}`);
    } catch {
      setProposeError("Network error");
      setProposing(false);
    }
  }

  if (error)
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-red-600">Research bundle not found.</p>
        <Link href="/planning" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to Planning
        </Link>
      </main>
    );

  if (!bundle)
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-gray-500 text-sm">
        Loading…
      </main>
    );

  // Group notes by source
  const notesBySource = bundle.notes.reduce<Record<string, ResearchNote[]>>(
    (acc, note) => {
      const key = note.source;
      if (!acc[key]) acc[key] = [];
      acc[key].push(note);
      return acc;
    },
    {}
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/planning"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Planning
        </Link>
        <button
          onClick={openPropose}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Propose Content Schedule
        </button>
      </div>

      {/* Propose modal */}
      {showPropose && (
        <div className="mb-6 rounded border border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-blue-800">
            Propose Content Schedule
          </h2>
          <div className="mb-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="proposeTarget"
                value="new"
                checked={proposeTarget === "new"}
                onChange={() => setProposeTarget("new")}
              />
              Create new schedule
            </label>
            {existingSchedules.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="radio"
                  name="proposeTarget"
                  value={s.id}
                  checked={proposeTarget === s.id}
                  onChange={() => setProposeTarget(s.id)}
                />
                Extend existing —{" "}
                <span className="font-mono text-xs text-gray-400">
                  {s.id.slice(0, 8)}
                </span>{" "}
                ({new Date(s.createdAt).toLocaleDateString()})
              </label>
            ))}
          </div>
          {proposeError && (
            <p className="mb-2 text-sm text-red-600">{proposeError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handlePropose}
              disabled={proposing}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {proposing ? "Starting…" : "Start Proposal"}
            </button>
            <button
              onClick={() => setShowPropose(false)}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <h1 className="mb-1 text-2xl font-bold tracking-tight">{bundle.topic}</h1>
      <p className="mb-6 text-xs text-gray-400">
        {new Date(bundle.createdAt).toLocaleString()}
      </p>

      {bundle.summary && (
        <section className="mb-8 rounded bg-blue-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-blue-800">Summary</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {bundle.summary}
          </p>
        </section>
      )}

      {Object.entries(notesBySource).map(([source, notes]) => (
        <section key={source} className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-800">
            {SOURCE_LABELS[source] ?? source}
            <span className="ml-2 text-xs font-normal text-gray-400">
              {notes.length} result{notes.length !== 1 ? "s" : ""}
            </span>
          </h2>
          <ul className="space-y-4">
            {notes.map((note, i) => (
              <li key={i} className="rounded border border-gray-200 p-4">
                <p className="mb-1 text-sm font-medium text-gray-900">
                  {note.url ? (
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {note.title}
                    </a>
                  ) : (
                    note.title
                  )}
                </p>
                <p className="text-sm text-gray-600">{note.content}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {bundle.notes.length === 0 && (
        <p className="text-sm text-gray-500">
          No results were found for this topic.
        </p>
      )}
    </main>
  );
}
