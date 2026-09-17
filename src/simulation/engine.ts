import {
  CELL,
  COLS,
  DT,
  EXIT_RATE,
  HORIZON,
  type Agent,
  type Layout,
  type Metrics,
  type Participant,
  type RunResult,
  type Sample,
} from "./types";
import { exitCells, flowField, makeGrid, neighbors, position } from "./grid";
export function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A shared, explicit cohort is sampled from the intersection of free, reachable cells. */
export function participantsFor(
  layouts: Layout[],
  count: number,
  seed: number,
): Participant[] {
  const grids = layouts.map(makeGrid);
  const fields = grids.map((g, i) => flowField(g, exitCells(layouts[i], g)));
  const free = Array.from(grids[0], (_, i) => i).filter(
    (i) =>
      grids.every((g, k) => !g[i] && Number.isFinite(fields[k][i])) &&
      fields.every((f) => f[i] > 3),
  );
  if (free.length < count)
    throw new Error(
      `These layouts have room for only ${free.length} shared starting positions. Remove obstacles or reduce the crowd.`,
    );
  const rng = random(seed);
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return free
    .slice(0, count)
    .map((cell, id) => ({ id, cell, speed: 0.95 + rng() * 0.5 }));
}
export class Simulation {
  readonly agents: Agent[];
  readonly blocked: Uint8Array;
  readonly field: Float64Array;
  readonly goals: Map<number, string>;
  readonly adjacent: number[][];
  readonly reservations: Int32Array;
  readonly tokens: Record<string, number> = {};
  readonly exitCounts: Record<string, number> = {};
  readonly series: Sample[] = [{ time: 0, exited: 0, queued: 0 }];
  tick = 0;
  exited = 0;
  peakQueue = 0;
  queued = 0;
  constructor(
    readonly layout: Layout,
    cohort: Participant[],
  ) {
    this.blocked = makeGrid(layout);
    this.goals = exitCells(layout, this.blocked);
    this.field = flowField(this.blocked, this.goals);
    this.adjacent = Array.from(this.blocked, (_, cell) =>
      neighbors(cell, this.blocked),
    );
    this.reservations = new Int32Array(this.blocked.length).fill(-1);
    const seen = new Set<number>();
    this.agents = cohort.map((p) => {
      if (
        seen.has(p.cell) ||
        this.blocked[p.cell] ||
        !Number.isFinite(this.field[p.cell])
      )
        throw new Error(
          "Participant starts in an occupied or unreachable cell.",
        );
      seen.add(p.cell);
      this.reservations[p.cell] = p.id;
      return {
        ...p,
        ...position(p.cell),
        target: p.cell,
        progress: 0,
        waited: 0,
        exitTime: null,
      };
    });
    for (const e of layout.exits) {
      this.tokens[e.id] = 0;
      this.exitCounts[e.id] = 0;
    }
  }
  get time() {
    return Math.round(this.tick * DT * 100) / 100;
  }
  get done() {
    return this.exited === this.agents.length || this.time >= HORIZON;
  }
  step() {
    if (this.done) return;
    this.tick++;
    for (const e of this.layout.exits)
      this.tokens[e.id] = Math.min(
        1,
        this.tokens[e.id] + e.width * EXIT_RATE * DT,
      );
    // Rotate priority each tick, so low participant IDs do not always win a reservation.
    for (let k = 0; k < this.agents.length; k++) {
      const a = this.agents[(k + this.tick) % this.agents.length];
      if (a.exitTime !== null) continue;
      if (a.cell === a.target) {
        const exit = this.goals.get(a.cell);
        if (exit && this.tokens[exit] >= 1 - 1e-9) {
          this.tokens[exit] -= 1;
          this.exitCounts[exit]++;
          this.exited++;
          a.exitTime = this.time;
          this.reservations[a.cell] = -1;
          continue;
        }
        if (exit) {
          a.waited += DT;
          continue;
        }
        let best = -1,
          bestScore = Infinity;
        for (const n of this.adjacent[a.cell]) {
          if (
            this.reservations[n] !== -1 ||
            this.field[n] > this.field[a.cell] + 0.001
          )
            continue;
          const dx = (n % COLS) - (a.cell % COLS),
            dy = Math.floor(n / COLS) - Math.floor(a.cell / COLS);
          if (
            dx &&
            dy &&
            (this.reservations[a.cell + dx] !== -1 ||
              this.reservations[a.cell + dy * COLS] !== -1)
          )
            continue;
          // Downstream occupancy spreads traffic across available paths without RNG per frame.
          let congestion = 0;
          for (const near of this.adjacent[n])
            if (
              this.reservations[near] !== -1 &&
              this.field[near] < this.field[n]
            )
              congestion++;
          const score =
            this.field[n] + congestion * 0.32 + ((n + a.id * 7) % 13) * 0.001;
          if (score < bestScore) {
            bestScore = score;
            best = n;
          }
        }
        if (best === -1) {
          a.waited += DT;
          continue;
        }
        a.target = best;
        a.progress = 0;
        this.reservations[best] = a.id;
      }
      const from = position(a.cell),
        to = position(a.target);
      a.progress = Math.min(
        1,
        a.progress + (a.speed * DT) / Math.hypot(to.x - from.x, to.y - from.y),
      );
      a.x = from.x + (to.x - from.x) * a.progress;
      a.y = from.y + (to.y - from.y) * a.progress;
      a.waited = 0;
      if (a.progress === 1) {
        this.reservations[a.cell] = -1;
        a.cell = a.target;
        a.progress = 0;
      }
    }
    this.queued = this.agents.filter(
      (a) => a.exitTime === null && a.waited >= 1,
    ).length;
    this.peakQueue = Math.max(this.peakQueue, this.queued);
    if (this.tick % 20 === 0 || this.done)
      this.series.push({
        time: this.time,
        exited: this.exited,
        queued: this.queued,
      });
  }
  metrics(): Metrics {
    const exitedAgents = this.agents.filter((a) => a.exitTime !== null);
    return {
      total: this.agents.length,
      exited: this.exited,
      remaining: this.agents.length - this.exited,
      elapsed: this.time,
      clearance: this.exited === this.agents.length ? this.time : null,
      meanExitTime: exitedAgents.length
        ? exitedAgents.reduce((n, a) => n + a.exitTime!, 0) /
          exitedAgents.length
        : null,
      peakQueue: this.peakQueue,
      status:
        this.exited === this.agents.length
          ? "complete"
          : this.time >= HORIZON
            ? "horizon"
            : "running",
      exitCounts: { ...this.exitCounts },
    };
  }
  result(): RunResult {
    return { metrics: this.metrics(), series: [...this.series] };
  }
}
export function runSimulation(
  layout: Layout,
  cohort: Participant[],
): RunResult {
  const simulation = new Simulation(layout, cohort);
  while (!simulation.done) simulation.step();
  return simulation.result();
}
export { CELL };
