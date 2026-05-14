export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { markInterruptedJobs } = await import("./lib/job-runner");
    const { markInterruptedDrafts } = await import("./lib/draft-store");
    markInterruptedJobs();
    markInterruptedDrafts();
  }
}
