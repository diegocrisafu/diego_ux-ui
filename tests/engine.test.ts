import { describe, expect, it } from "vitest";
import {
  participantsFor,
  runSimulation,
  Simulation,
} from "../src/simulation/engine";
import { scenarios, improveLayout } from "../src/simulation/scenarios";
import { isFree } from "../src/simulation/grid";
import { DT, EXIT_RATE, RADIUS, type Layout } from "../src/simulation/types";
import { parseProject } from "../src/simulation/schema";
const layout = scenarios[0].layout;

describe("deterministic crowd simulation", () => {
  it("reproduces positions and results for the same seed", () => {
    const a = new Simulation(layout, participantsFor([layout], 80, 42)),
      b = new Simulation(layout, participantsFor([layout], 80, 42));
    for (let i = 0; i < 450; i++) {
      a.step();
      b.step();
    }
    expect(a.agents).toEqual(b.agents);
    expect(a.result()).toEqual(b.result());
    expect(participantsFor([layout], 80, 43)).not.toEqual(
      participantsFor([layout], 80, 42),
    );
  });
  it("keeps agents out of obstacles and physically separated throughout a congested run", () => {
    const sim = new Simulation(layout, participantsFor([layout], 200, 721));
    let minDistance = Infinity,
      previous = 0;
    while (!sim.done) {
      sim.step();
      expect(sim.exited).toBeGreaterThanOrEqual(previous);
      previous = sim.exited;
      if (sim.tick % 4 !== 0) continue;
      const active = sim.agents.filter((a) => a.exitTime === null);
      for (let i = 0; i < active.length; i++) {
        expect(isFree(layout, active[i].x, active[i].y)).toBe(true);
        for (let j = i + 1; j < active.length; j++)
          minDistance = Math.min(
            minDistance,
            Math.hypot(active[i].x - active[j].x, active[i].y - active[j].y),
          );
      }
    }
    expect(minDistance).toBeGreaterThanOrEqual(RADIUS * 2 - 1e-8);
    expect(sim.exited).toBe(200);
  });
  it("never exceeds each exit token capacity", () => {
    const sim = new Simulation(layout, participantsFor([layout], 200, 4));
    while (!sim.done) {
      sim.step();
      for (const e of layout.exits)
        expect(sim.exitCounts[e.id]).toBeLessThanOrEqual(
          Math.floor(sim.time * e.width * EXIT_RATE + 1e-7),
        );
    }
  });
  it.each(scenarios)(
    "clears the seeded $title scenario",
    ({ layout: venue }) => {
      const result = runSimulation(venue, participantsFor([venue], 200, 721));
      expect(result.metrics.exited).toBe(200);
      expect(result.metrics.clearance).not.toBeNull();
      expect(result.series.at(-1)?.exited).toBe(200);
    },
  );
  it("uses identical participants, positions, and speeds for comparisons", () => {
    const improved = improveLayout(layout),
      cohort = participantsFor([layout, improved], 200, 721);
    const a = new Simulation(layout, cohort),
      b = new Simulation(improved, cohort);
    expect(a.agents).toEqual(b.agents);
    const original = runSimulation(layout, cohort),
      after = runSimulation(improved, cohort);
    expect(after.metrics.clearance!).toBeLessThan(original.metrics.clearance!);
    expect(cohort).toEqual(participantsFor([layout, improved], 200, 721));
  });
  it("routes around a barrier without cutting corners", () => {
    const barrier: Layout = {
      name: "Barrier",
      obstacles: [{ id: "wall", label: "Wall", x: 15, y: 0, w: 1.2, h: 17.4 }],
      exits: [
        { id: "e", label: "Exit", side: "east", center: 10.8, width: 3.6 },
      ],
    };
    const sim = new Simulation(barrier, [{ id: 0, cell: 400, speed: 1.2 }]);
    while (!sim.done) {
      sim.step();
      expect(isFree(barrier, sim.agents[0].x, sim.agents[0].y)).toBe(true);
    }
    expect(sim.exited).toBe(1);
    expect(sim.time).toBeGreaterThan(20);
  });
  it("ends at the horizon honestly when a queue cannot clear", () => {
    const slow = new Simulation(
      layout,
      participantsFor([layout], 20, 1).map((p) => ({ ...p, speed: 0.001 })),
    );
    while (!slow.done) slow.step();
    expect(slow.metrics().status).toBe("horizon");
    expect(slow.metrics().clearance).toBeNull();
    expect(slow.time).toBe(180);
    expect(DT).toBe(0.05);
  });
});

describe("project validation", () => {
  const project = { version: 1, seed: 721, crowd: 200, layout };
  it("round-trips a saved layout", () => {
    expect(parseProject(JSON.stringify(project))).toEqual(project);
  });
  it.each([
    "no json",
    "null",
    "[]",
    "{}",
    '{"version":7}',
    JSON.stringify({ ...project, crowd: 10000 }),
    JSON.stringify({ ...project, seed: 2.3 }),
    JSON.stringify({ ...project, layout: { ...layout, exits: [] } }),
    JSON.stringify({
      ...project,
      layout: {
        ...layout,
        obstacles: [{ id: "a", label: "bad", x: -1, y: 0, w: 4, h: 4 }],
      },
    }),
    JSON.stringify({
      ...project,
      layout: { ...layout, exits: [layout.exits[0], layout.exits[0]] },
    }),
  ])("rejects invalid input %s", (input) =>
    expect(() => parseProject(input)).toThrow(),
  );
  it("rejects an obstructed exit and oversized input", () => {
    expect(() =>
      parseProject(
        JSON.stringify({
          ...project,
          layout: {
            ...layout,
            obstacles: [
              { id: "wall", label: "Wall", x: 30, y: 0, w: 2.4, h: 21.6 },
            ],
          },
        }),
      ),
    ).toThrow(/blocked/);
    expect(() => parseProject(" ".repeat(100001))).toThrow(/large/);
  });
});
