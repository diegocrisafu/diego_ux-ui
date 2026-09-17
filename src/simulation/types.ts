export const CELL = 0.6;
export const COLS = 54;
export const ROWS = 36;
export const WIDTH = 32.4;
export const HEIGHT = 21.6;
export const DT = 0.05;
export const HORIZON = 180;
export const RADIUS = 0.19;
export const EXIT_RATE = 1.3;
export type Side = "east" | "west" | "north" | "south";
export interface Obstacle {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Exit {
  id: string;
  label: string;
  side: Side;
  center: number;
  width: number;
}
export interface Layout {
  name: string;
  obstacles: Obstacle[];
  exits: Exit[];
}
export interface Project {
  version: 1;
  seed: number;
  crowd: number;
  layout: Layout;
}
export interface Participant {
  id: number;
  cell: number;
  speed: number;
}
export interface Agent extends Participant {
  x: number;
  y: number;
  target: number;
  progress: number;
  waited: number;
  exitTime: number | null;
}
export interface Sample {
  time: number;
  exited: number;
  queued: number;
}
export interface Metrics {
  total: number;
  exited: number;
  remaining: number;
  elapsed: number;
  clearance: number | null;
  meanExitTime: number | null;
  peakQueue: number;
  status: "running" | "complete" | "horizon";
  exitCounts: Record<string, number>;
}
export interface RunResult {
  metrics: Metrics;
  series: Sample[];
}
export interface Comparison {
  before: RunResult;
  after: RunResult;
  seed: number;
  crowd: number;
  participants: Participant[];
  original: Layout;
  edited: Layout;
}
