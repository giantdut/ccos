import { registerJob } from "../job-runner";
import {
  fetchFromSource,
  SOURCE_LABELS,
  type WebSource,
} from "../web-sources-adapter";
import { createIndex, type Partition } from "../internal-source-index";
import { synthesizeResearch } from "../researcher-agent";
import db from "../db";

export type PlanningSessionInput = {
  sessionId: string;
  topic: string;
  webSources: WebSource[];
  includeKnowledge: boolean;
  includeApproved: boolean;
};

registerJob(
  "planning-session",
  async (rawInput, emit) => {
    const input = rawInput as PlanningSessionInput;
    const { sessionId, topic, webSources, includeKnowledge, includeApproved } =
      input;

    const webResults: {
      source: WebSource;
      title: string;
      url: string;
      snippet: string;
    }[] = [];

    // Fetch from each selected web source
    for (const source of webSources) {
      emit("progress", {
        step: "fetching",
        source,
        message: `Fetching from ${SOURCE_LABELS[source]}…`,
      });

      const results = await fetchFromSource(source, topic);
      webResults.push(...results);

      emit("progress", {
        step: "fetched",
        source,
        message: `Got ${results.length} result(s) from ${SOURCE_LABELS[source]}`,
        count: results.length,
      });
    }

    // Fetch from internal sources
    const internalResults: {
      partition: Partition;
      filename: string;
      snippet: string;
    }[] = [];

    const partitions: Partition[] = [];
    if (includeKnowledge) partitions.push("knowledge");
    if (includeApproved) partitions.push("approved");

    if (partitions.length > 0) {
      emit("progress", {
        step: "fetching-internal",
        message: "Searching internal sources…",
      });

      const index = createIndex(db);
      const hits = index.search(topic, partitions);
      internalResults.push(
        ...hits.map((h) => ({
          partition: h.partition,
          filename: h.filename,
          snippet: h.snippet,
        }))
      );

      emit("progress", {
        step: "fetched-internal",
        message: `Got ${hits.length} result(s) from internal sources`,
        count: hits.length,
      });
    }

    emit("progress", {
      step: "synthesizing",
      message: "Synthesizing research with Claude…",
    });

    const bundle = await synthesizeResearch(topic, webResults, internalResults);

    // Persist the bundle
    db.prepare(
      `INSERT OR REPLACE INTO research_bundles (session_id, content, created_at)
       VALUES (?, ?, datetime('now'))`
    ).run(sessionId, JSON.stringify(bundle));

    emit("progress", { step: "done", message: "Research bundle ready" });

    return { sessionId };
  }
);
