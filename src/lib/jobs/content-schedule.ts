import { registerJob } from "../job-runner";
import { proposeScheduleItems } from "../schedule-proposer-agent";
import { addScheduleItems } from "../schedule-store";
import db from "../db";
import type { ResearchBundle } from "../researcher-agent";

export type ContentScheduleInput = {
  scheduleId: string;
  bundleSessionId: string;
};

registerJob("content-schedule", async (rawInput, emit) => {
  const { scheduleId, bundleSessionId } = rawInput as ContentScheduleInput;

  emit("progress", { step: "loading", message: "Loading research bundle…" });

  const row = db
    .prepare("SELECT content FROM research_bundles WHERE session_id = ?")
    .get(bundleSessionId) as { content: string } | undefined;

  if (!row)
    throw new Error(`Research bundle not found for session ${bundleSessionId}`);

  const bundle = JSON.parse(row.content) as ResearchBundle;

  emit("progress", {
    step: "proposing",
    message: "Proposing content schedule with Claude…",
  });

  const items = await proposeScheduleItems(bundle);

  emit("progress", {
    step: "saving",
    message: `Saving ${items.length} schedule items…`,
  });

  addScheduleItems(scheduleId, items);

  emit("progress", { step: "done", message: "Schedule proposal ready" });

  return { scheduleId, itemCount: items.length };
});
