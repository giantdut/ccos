import { registerJob } from "../job-runner";
import {
  setDraftStatus,
  setExpandedOutline,
  saveDraft,
  markDraftFailed,
} from "../draft-store";
import { expandOutline } from "../outline-expander-agent";
import { writeDraft } from "../draft-writer-agent";
import { getProfile } from "../brand-profile-store";
import db from "../db";

export type DraftingPipelineInput = {
  taskId: string;
};

registerJob("drafting-pipeline", async (rawInput, emit) => {
  const { taskId } = rawInput as DraftingPipelineInput;

  const task = db
    .prepare(`SELECT id, title, outline FROM tasks WHERE id = ?`)
    .get(taskId) as { id: string; title: string; outline: string } | undefined;

  if (!task) throw new Error(`Task ${taskId} not found`);

  const brand = getProfile();

  emit("progress", { step: "expanding", message: "Expanding outline…" });
  setDraftStatus(taskId, "expanding");

  let expandedOutline: string;
  try {
    expandedOutline = await expandOutline(task.title, task.outline, brand);
  } catch (err) {
    markDraftFailed(taskId);
    throw err;
  }

  setExpandedOutline(taskId, expandedOutline);
  emit("progress", {
    step: "drafting",
    message: "Outline expanded. Writing draft…",
  });

  let draft: string;
  try {
    draft = await writeDraft(task.title, expandedOutline, brand);
  } catch (err) {
    markDraftFailed(taskId);
    throw err;
  }

  saveDraft(taskId, draft);
  emit("progress", { step: "ready", message: "Draft ready for review." });

  return { taskId };
});
