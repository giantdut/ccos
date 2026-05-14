import { registerJob } from "../job-runner";

registerJob("hello-agent", async (_input, emit) => {
  for (let i = 1; i <= 5; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    emit("progress", { message: `step ${i} of 5` });
  }
  return { message: "hello from agent" };
});
