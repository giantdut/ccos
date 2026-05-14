"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Task = {
  id: string;
  scheduleId: string;
  title: string;
  publishDate: string;
  outline: string;
  status: string;
};

type Draft = {
  id: string;
  taskId: string;
  jobId: string | null;
  expandedOutline: string | null;
  agentDraft: string | null;
  draftContent: string | null;
  editDistance: number;
  status: string;
};

type ProgressEvent = { step: string; message: string };

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState(false);

  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineFailed, setPipelineFailed] = useState(false);

  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const [showOutline, setShowOutline] = useState(false);

  const esRef = useRef<EventSource | null>(null);

  function loadTask() {
    fetch(`/api/tasks/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data: { task: Task; draft: Draft | null }) => {
        setTask(data.task);
        setDraft(data.draft);
        if (data.draft?.draftContent) {
          setEditContent(data.draft.draftContent);
        }
      })
      .catch(() => setError(true));
  }

  useEffect(() => {
    loadTask();
  }, [id]);

  // Subscribe to pipeline progress when draft has a jobId and isn't done yet
  useEffect(() => {
    if (!draft?.jobId) return;
    if (
      draft.status === "ready" ||
      draft.status === "approved" ||
      draft.status === "failed" ||
      draft.status === "interrupted"
    )
      return;

    setPipelineRunning(true);
    const es = new EventSource(`/api/jobs/${draft.jobId}/stream`);
    esRef.current = es;

    es.addEventListener("progress", (ev) => {
      const data = JSON.parse(ev.data) as ProgressEvent;
      setProgress((prev) => [...prev, data]);
    });

    es.addEventListener("done", (ev) => {
      const data = JSON.parse(ev.data) as { status: string };
      if (data.status !== "completed") setPipelineFailed(true);
      setPipelineRunning(false);
      es.close();
      loadTask();
    });

    es.onerror = () => {
      setPipelineFailed(true);
      setPipelineRunning(false);
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [draft?.jobId, draft?.status]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/tasks/${id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setSaveError(body.error ?? "Save failed");
        return;
      }
      const body = await res.json() as { draft: Draft };
      setDraft(body.draft);
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setApproveError(null);
    try {
      const res = await fetch(`/api/tasks/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setApproveError(body.error ?? "Approval failed");
        return;
      }
      loadTask();
    } catch {
      setApproveError("Network error");
    } finally {
      setApproving(false);
    }
  }

  if (error)
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-red-600">Task not found.</p>
      </main>
    );

  if (!task)
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-gray-500">
        Loading…
      </main>
    );

  const isReady = draft?.status === "ready";
  const isApproved = draft?.status === "approved";
  const isDrafting =
    draft?.status === "pending" ||
    draft?.status === "expanding" ||
    draft?.status === "drafting";
  const isFailed =
    draft?.status === "failed" || draft?.status === "interrupted";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/content-schedules/${task.scheduleId}`}
        className="mb-6 inline-block text-sm text-blue-600 hover:underline"
      >
        ← Back to Schedule
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
        <p className="mt-0.5 text-xs text-gray-400">
          {task.publishDate} ·{" "}
          <span
            className={
              isApproved
                ? "text-green-600 font-medium"
                : isReady
                  ? "text-blue-600 font-medium"
                  : isFailed
                    ? "text-red-600 font-medium"
                    : "text-yellow-600 font-medium"
            }
          >
            {task.status}
          </span>
        </p>
      </div>

      {/* Pipeline progress */}
      {(pipelineRunning || progress.length > 0) && (
        <section className="mb-6 rounded bg-gray-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {pipelineRunning ? "Generating draft…" : "Pipeline complete"}
          </h2>
          <ul className="space-y-1 text-sm text-gray-600">
            {progress.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gray-400">›</span>
                {p.message}
              </li>
            ))}
          </ul>
          {pipelineFailed && (
            <p className="mt-2 text-sm text-red-600">Pipeline failed.</p>
          )}
        </section>
      )}

      {isFailed && !pipelineRunning && (
        <div className="mb-6 rounded bg-red-50 p-4 text-sm text-red-700">
          The drafting pipeline was interrupted or failed. The Operator can
          re-run it from the schedule page.
        </div>
      )}

      {/* Expanded outline toggle */}
      {draft?.expandedOutline && (
        <section className="mb-6">
          <button
            onClick={() => setShowOutline((v) => !v)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {showOutline ? "▾ Hide expanded outline" : "▸ Show expanded outline"}
          </button>
          {showOutline && (
            <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-4">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 font-sans">
                {draft.expandedOutline}
              </pre>
            </div>
          )}
        </section>
      )}

      {/* Draft editor */}
      {(isReady || isApproved) && draft?.draftContent !== null && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Draft</h2>
            {draft.editDistance > 0 && (
              <span className="text-xs text-gray-400">
                {draft.editDistance} edits from agent output
              </span>
            )}
          </div>

          {isApproved ? (
            <div className="rounded border border-green-200 bg-green-50 p-4">
              <p className="mb-3 text-sm font-medium text-green-700">
                Approved content
              </p>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                {draft.draftContent}
              </pre>
            </div>
          ) : (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={24}
              className="w-full rounded border border-gray-200 p-3 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          )}

          {saveError && (
            <p className="mt-1 text-xs text-red-600">{saveError}</p>
          )}
          {approveError && (
            <p className="mt-1 text-xs text-red-600">{approveError}</p>
          )}

          {!isApproved && (
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save edits"}
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approving ? "Approving…" : "Approve"}
              </button>
            </div>
          )}

          {isApproved && (
            <a
              href={`/api/tasks/${id}/export`}
              className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Export as Markdown
            </a>
          )}
        </section>
      )}

      {isDrafting && !draft?.draftContent && (
        <p className="text-sm text-gray-500">
          Drafting pipeline is running…
        </p>
      )}
    </main>
  );
}
