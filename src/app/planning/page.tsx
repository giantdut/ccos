"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WebSource = "youtube" | "reddit" | "hackernews" | "medium" | "substack";

const WEB_SOURCES: { id: WebSource; label: string }[] = [
  { id: "youtube", label: "YouTube" },
  { id: "reddit", label: "Reddit" },
  { id: "hackernews", label: "Hacker News" },
  { id: "medium", label: "Medium" },
  { id: "substack", label: "Substack" },
];

type Session = {
  id: string;
  topic: string;
  jobId: string;
  status: string;
  createdAt: string;
};

type ProgressEvent = { step: string; message: string; source?: string };

export default function PlanningPage() {
  const [topic, setTopic] = useState("");
  const [webSources, setWebSources] = useState<Set<WebSource>>(
    new Set(["reddit", "hackernews"])
  );
  const [includeKnowledge, setIncludeKnowledge] = useState(false);
  const [includeApproved, setIncludeApproved] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [jobDone, setJobDone] = useState(false);
  const [jobFailed, setJobFailed] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);

  function loadSessions() {
    fetch("/api/planning-sessions")
      .then((r) => r.json())
      .then((data) => setSessions(data as Session[]))
      .catch(() => {});
  }

  useEffect(() => {
    loadSessions();
  }, []);

  function toggleSource(src: WebSource) {
    setWebSources((prev) => {
      const next = new Set(prev);
      next.has(src) ? next.delete(src) : next.add(src);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setSubmitting(true);
    setProgress([]);
    setJobDone(false);
    setJobFailed(false);

    try {
      const res = await fetch("/api/planning-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          webSources: Array.from(webSources),
          includeKnowledge,
          includeApproved,
        }),
      });

      const { sessionId, jobId } = (await res.json()) as {
        sessionId: string;
        jobId: string;
      };

      setActiveSessionId(sessionId);
      setActiveJobId(jobId);
      loadSessions();

      const es = new EventSource(`/api/jobs/${jobId}/stream`);

      es.addEventListener("progress", (ev) => {
        const data = JSON.parse(ev.data) as ProgressEvent;
        setProgress((prev) => [...prev, data]);
      });

      es.addEventListener("done", (ev) => {
        const data = JSON.parse(ev.data) as { status: string };
        if (data.status !== "completed") setJobFailed(true);
        setJobDone(true);
        es.close();
        setSubmitting(false);
        loadSessions();
      });

      es.onerror = () => {
        setJobFailed(true);
        setJobDone(true);
        es.close();
        setSubmitting(false);
      };
    } catch {
      setJobFailed(true);
      setJobDone(true);
      setSubmitting(false);
    }
  }

  const checkboxClass =
    "flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        New Planning Session
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. AI tools for content marketing"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Web sources</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WEB_SOURCES.map(({ id, label }) => (
              <label key={id} className={checkboxClass}>
                <input
                  type="checkbox"
                  checked={webSources.has(id)}
                  onChange={() => toggleSource(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            Internal sources
          </p>
          <div className="flex flex-col gap-2">
            <label className={checkboxClass}>
              <input
                type="checkbox"
                checked={includeKnowledge}
                onChange={(e) => setIncludeKnowledge(e.target.checked)}
              />
              Knowledge uploads
            </label>
            <label className={checkboxClass}>
              <input
                type="checkbox"
                checked={includeApproved}
                onChange={(e) => setIncludeApproved(e.target.checked)}
              />
              Approved content
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Running…" : "Start Planning Session"}
        </button>
      </form>

      {/* Progress */}
      {progress.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Progress
          </h2>
          <ul className="space-y-1 rounded bg-gray-50 p-4 text-sm text-gray-700">
            {progress.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gray-400">›</span>
                {p.message}
              </li>
            ))}
          </ul>

          {jobDone && !jobFailed && activeSessionId && (
            <div className="mt-4">
              <Link
                href={`/research-bundles/${activeSessionId}`}
                className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                View Research Bundle →
              </Link>
            </div>
          )}

          {jobFailed && (
            <p className="mt-3 text-sm text-red-600">
              Session failed.{" "}
              <button
                className="underline"
                onClick={() => {
                  setProgress([]);
                  setJobDone(false);
                  setJobFailed(false);
                  setActiveJobId(null);
                  setActiveSessionId(null);
                }}
              >
                Retry
              </button>
            </p>
          )}
        </div>
      )}

      {/* Past sessions */}
      {sessions.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-lg font-semibold">Past Sessions</h2>
          <ul className="divide-y divide-gray-100 rounded border border-gray-200">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.topic}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {new Date(s.createdAt).toLocaleString()} ·{" "}
                    <span
                      className={
                        s.status === "completed"
                          ? "text-green-600"
                          : s.status === "failed" || s.status === "interrupted"
                            ? "text-red-500"
                            : "text-yellow-600"
                      }
                    >
                      {s.status}
                    </span>
                  </p>
                </div>
                {s.status === "completed" && (
                  <Link
                    href={`/research-bundles/${s.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View bundle →
                  </Link>
                )}
                {(s.status === "running" || s.status === "pending") &&
                  activeJobId === s.jobId && (
                    <span className="text-xs text-yellow-600">In progress…</span>
                  )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
