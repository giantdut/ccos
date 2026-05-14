"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type TaskRow = {
  id: string;
  title: string;
  publishDate: string;
  status: string;
  overdue: boolean;
};

type Counts = {
  pending: number;
  drafting: number;
  inReview: number;
  approved: number;
  overdue: number;
};

type ProgressData = {
  scheduleId: string;
  tasks: TaskRow[];
  counts: Counts;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  drafting: "bg-blue-100 text-blue-800",
  "in-review": "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
};

const TERMINAL_STATUSES = new Set(["approved", "in-review"]);

export default function ProgressPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function loadProgress() {
    fetch(`/api/content-schedules/${id}/progress`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => setData(d as ProgressData))
      .catch(() => setError(true));
  }

  useEffect(() => {
    loadProgress();
  }, [id]);

  // Poll every 5s while any task is not in a terminal state
  useEffect(() => {
    if (!data) return;

    const hasNonTerminal = data.tasks.some(
      (t) => !TERMINAL_STATUSES.has(t.status)
    );

    if (hasNonTerminal) {
      intervalRef.current = setInterval(loadProgress, 5000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [data]);

  if (error) {
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
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-gray-500">
        Loading…
      </main>
    );
  }

  const { tasks, counts } = data;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/content-schedules/${id}`}
        className="mb-6 inline-block text-sm text-blue-600 hover:underline"
      >
        ← Back to Schedule
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Progress Review</h1>
        <p className="mt-0.5 text-xs text-gray-400">
          Schedule{" "}
          <span className="font-mono">{id.slice(0, 8)}</span>
        </p>
      </div>

      {/* Summary bar */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded border border-gray-200 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-yellow-700">{counts.pending}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="rounded border border-gray-200 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-blue-700">{counts.drafting}</p>
          <p className="text-xs text-gray-500">Drafting</p>
        </div>
        <div className="rounded border border-gray-200 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-purple-700">{counts.inReview}</p>
          <p className="text-xs text-gray-500">In Review</p>
        </div>
        <div className="rounded border border-gray-200 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-green-700">{counts.approved}</p>
          <p className="text-xs text-gray-500">Approved</p>
        </div>
        <div className="rounded border border-gray-200 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-red-700">{counts.overdue}</p>
          <p className="text-xs text-gray-500">Overdue</p>
        </div>
      </section>

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500">No tasks yet for this schedule.</p>
      ) : (
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-800">
            Tasks
            <span className="ml-2 text-xs font-normal text-gray-400">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </span>
          </h2>
          <ul className="divide-y divide-gray-100 rounded border border-gray-200">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {task.publishDate}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    {task.overdue && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold uppercase text-red-700">
                        Overdue
                      </span>
                    )}
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {task.status}
                    </span>
                    <span className="text-xs text-gray-400">→</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
