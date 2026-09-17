import { participantsFor, Simulation } from "./engine";
import type { Comparison, Layout } from "./types";
self.onmessage = ({
  data,
}: MessageEvent<{
  original: Layout;
  edited: Layout;
  crowd: number;
  seed: number;
}>) => {
  try {
    const { original, edited, crowd, seed } = data;
    const participants = participantsFor([original, edited], crowd, seed);
    const before = new Simulation(original, participants),
      after = new Simulation(edited, participants);
    let steps = 0;
    while (!before.done || !after.done) {
      before.step();
      after.step();
      steps++;
      if (steps % 100 === 0)
        self.postMessage({
          type: "progress",
          elapsed: Math.max(before.time, after.time),
        });
    }
    const result: Comparison = {
      before: before.result(),
      after: after.result(),
      seed,
      crowd,
      participants,
      original,
      edited,
    };
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Comparison failed. Try a smaller crowd.",
    });
  }
};
