import { NextRequest } from "next/server";
import {
  getJob,
  getJobEvents,
  subscribeToJob,
} from "@/lib/job-runner";
// Ensure job handlers are registered
import "@/lib/jobs/hello-agent";
import "@/lib/jobs/drafting-pipeline";

export const runtime = "nodejs";

const TERMINAL_STATUSES = new Set(["completed", "failed", "interrupted"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  function sseMessage(event: string, data: unknown): Uint8Array {
    return encoder.encode(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      // Replay stored events first
      const storedEvents = getJobEvents(id);
      for (const ev of storedEvents) {
        controller.enqueue(
          sseMessage(ev.event, JSON.parse(ev.data))
        );
      }

      // If already terminal, close immediately
      if (TERMINAL_STATUSES.has(job.status)) {
        controller.enqueue(sseMessage("done", { status: job.status }));
        controller.close();
        return;
      }

      // Subscribe to live events
      const unsubscribe = subscribeToJob(id, (event, data) => {
        try {
          controller.enqueue(sseMessage(event, data));
          if (event === "done") {
            controller.close();
            unsubscribe();
          }
        } catch {
          // Controller already closed
          unsubscribe();
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
