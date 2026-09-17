import { performance } from "node:perf_hooks";
import { participantsFor, runSimulation } from "../src/simulation/engine";
import { scenarios, improveLayout } from "../src/simulation/scenarios";
for (const scenario of scenarios) {
  const edited = improveLayout(scenario.layout);
  const start = performance.now();
  const cohort = participantsFor([scenario.layout, edited], 200, 721);
  const before = runSimulation(scenario.layout, cohort),
    after = runSimulation(edited, cohort);
  console.log(
    JSON.stringify({
      scenario: scenario.title,
      crowd: 200,
      seed: 721,
      originalSeconds: before.metrics.clearance,
      editedSeconds: after.metrics.clearance,
      originalRemaining: before.metrics.remaining,
      editedRemaining: after.metrics.remaining,
      computeMs: +(performance.now() - start).toFixed(1),
    }),
  );
}
