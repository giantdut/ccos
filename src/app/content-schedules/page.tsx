"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ContentSchedule = {
  id: string;
  status: string;
  bundleSessionId: string | null;
  jobId: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ContentSchedulesPage() {
  const [schedules, setSchedules] = useState<ContentSchedule[]>([]);

  useEffect(() => {
    fetch("/api/content-schedules")
      .then((r) => r.json())
      .then((data) => setSchedules(data as ContentSchedule[]))
      .catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        Content Schedules
      </h1>

      {schedules.length === 0 ? (
        <p className="text-sm text-gray-500">
          No content schedules yet. Start a{" "}
          <Link href="/planning" className="text-blue-600 hover:underline">
            Planning session
          </Link>{" "}
          and propose a schedule from the research bundle.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded border border-gray-200">
          {schedules.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Schedule{" "}
                  <span className="font-mono text-xs text-gray-400">
                    {s.id.slice(0, 8)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(s.createdAt).toLocaleString()} ·{" "}
                  <span
                    className={
                      s.status === "approved"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }
                  >
                    {s.status}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                {s.status === "approved" && (
                  <Link
                    href={`/content-schedules/${s.id}/progress`}
                    className="text-sm text-purple-600 hover:underline"
                  >
                    Progress →
                  </Link>
                )}
                <Link
                  href={`/content-schedules/${s.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
