"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

type ScheduleItem = {
  id: string;
  title: string;
  publishDate: string;
  outline: string;
  position: number;
};

type Task = {
  id: string;
  title: string;
  publishDate: string;
  status: string;
};

type ScheduleDetail = {
  id: string;
  status: string;
  bundleSessionId: string | null;
  jobId: string | null;
  createdAt: string;
  items: ScheduleItem[];
  tasks: Task[];
};

type ProgressEvent = { step: string; message: string };

export default function ContentSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [proposalRunning, setProposalRunning] = useState(false);
  const [proposalFailed, setProposalFailed] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  function loadSchedule() {
    fetch(`/api/content-schedules/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => setSchedule(data as ScheduleDetail))
      .catch(() => setError(true));
  }

  useEffect(() => {
    loadSchedule();
  }, [id]);

  useEffect(() => {
    if (!jobId) return;

    setProposalRunning(true);

    const es = new EventSource(`/api/jobs/${jobId}/stream`);

    es.addEventListener("progress", (ev) => {
      const data = JSON.parse(ev.data) as ProgressEvent;
      setProgress((prev) => [...prev, data]);
    });

    es.addEventListener("done", (ev) => {
      const data = JSON.parse(ev.data) as { status: string };
      if (data.status !== "completed") setProposalFailed(true);
      setProposalRunning(false);
      es.close();
      loadSchedule();
    });

    es.onerror = () => {
      setProposalFailed(true);
      setProposalRunning(false);
      es.close();
    };

    return () => es.close();
  }, [jobId]);

  async function handleApprove() {
    setApproving(true);
    setApproveError(null);
    try {
      const res = await fetch(`/api/content-schedules/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setApproveError(body.error ?? "Approval failed");
        setApproving(false);
        return;
      }
      loadSchedule();
    } catch {
      setApproveError("Network error");
    } finally {
      setApproving(false);
    }
  }

  if (error)
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-red-600">Schedule not found.</p>
        <Link
          href="/content-schedules"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to Schedules
        </Link>
      </main>
    );

  if (!schedule)
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-gray-500">
        Loading…
      </main>
    );

  const isProposed = schedule.status === "proposed";
  const isApproved = schedule.status === "approved";
  const hasItems = schedule.items.length > 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/content-schedules"
        className="mb-6 inline-block text-sm text-blue-600 hover:underline"
      >
        ← Back to Schedules
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Content Schedule
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            {new Date(schedule.createdAt).toLocaleString()} ·{" "}
            <span
              className={
                isApproved ? "text-green-600 font-medium" : "text-yellow-600 font-medium"
              }
            >
              {schedule.status}
            </span>
          </p>
        </div>

        {isProposed && hasItems && !proposalRunning && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {approving ? "Approving…" : "Approve Schedule"}
          </button>
        )}
      </div>

      {approveError && (
        <p className="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-600">
          {approveError}
        </p>
      )}

      {/* Proposal progress */}
      {(proposalRunning || progress.length > 0) && (
        <section className="mb-8 rounded bg-gray-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {proposalRunning ? "Generating proposal…" : "Proposal complete"}
          </h2>
          <ul className="space-y-1 text-sm text-gray-600">
            {progress.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gray-400">›</span>
                {p.message}
              </li>
            ))}
          </ul>
          {proposalFailed && (
            <p className="mt-2 text-sm text-red-600">Proposal failed.</p>
          )}
        </section>
      )}

      {/* Schedule items */}
      {hasItems ? (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-800">
            Schedule Items
            <span className="ml-2 text-xs font-normal text-gray-400">
              {schedule.items.length} piece{schedule.items.length !== 1 ? "s" : ""}
            </span>
          </h2>
          <ul className="space-y-4">
            {schedule.items.map((item) => (
              <li
                key={item.id}
                className="rounded border border-gray-200 p-4"
              >
                <div className="mb-1 flex items-start justify-between gap-4">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="shrink-0 text-xs text-gray-400">
                    {item.publishDate}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-600">
                  {item.outline}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : !proposalRunning ? (
        <p className="text-sm text-gray-500">
          No schedule items yet. The proposal is being generated.
        </p>
      ) : null}

      {/* Tasks (after approval) */}
      {isApproved && schedule.tasks.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              Tasks
              <span className="ml-2 text-xs font-normal text-gray-400">
                {schedule.tasks.length} task{schedule.tasks.length !== 1 ? "s" : ""}
              </span>
            </h2>
            <Link
              href={`/content-schedules/${id}/progress`}
              className="text-sm text-blue-600 hover:underline"
            >
              Progress Review →
            </Link>
          </div>
          <ul className="divide-y divide-gray-100 rounded border border-gray-200">
            {schedule.tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {task.publishDate} ·{" "}
                      <span
                        className={
                          task.status === "approved"
                            ? "text-green-600"
                            : task.status === "in-review"
                              ? "text-blue-600"
                              : "text-yellow-600"
                        }
                      >
                        {task.status}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
