"use client";

import { useState } from "react";

export default function Home() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  async function runTestJob() {
    setLog([]);
    setRunning(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "hello-agent" }),
      });
      const { jobId } = (await res.json()) as { jobId: string };
      setLog((prev) => [...prev, `Job started: ${jobId}`]);

      const es = new EventSource(`/api/jobs/${jobId}/stream`);

      es.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data) as { message: string };
        setLog((prev) => [...prev, `progress: ${data.message}`]);
      });

      es.addEventListener("done", (e) => {
        const data = JSON.parse(e.data) as { status: string };
        setLog((prev) => [...prev, `done: ${data.status}`]);
        es.close();
        setRunning(false);
      });

      es.onerror = () => {
        setLog((prev) => [...prev, "SSE connection error"]);
        es.close();
        setRunning(false);
      };
    } catch (err) {
      setLog((prev) => [
        ...prev,
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      ]);
      setRunning(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">CCOS</h1>
        <p className="mt-2 text-gray-500">
          Content Operations Claude Code Operating System
        </p>
        <div className="mt-6">
          <button
            onClick={runTestJob}
            disabled={running}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? "Running…" : "Test job runner"}
          </button>
        </div>
        {log.length > 0 && (
          <pre className="mt-4 rounded bg-gray-100 p-4 text-left text-sm text-gray-800">
            {log.join("\n")}
          </pre>
        )}
      </div>
    </main>
  );
}
