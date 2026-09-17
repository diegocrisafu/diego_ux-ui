import {
  CELL,
  WIDTH,
  HEIGHT,
  type Layout,
  type Project,
  type Side,
} from "./types";
import { exitCells, makeGrid } from "./grid";
const fail = (message: string): never => {
  throw new Error(message);
};
const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : fail("Expected a JSON object.");
const number = (v: unknown, min: number, max: number, label: string): number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : fail(`${label} must be a number from ${min} to ${max}.`);
const label = (v: unknown, name: string) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 60
    ? v.trim()
    : fail(`${name} must contain 1–60 characters.`);
export const snap = (value: number) => Math.round(value / CELL) * CELL;
export function validateLayout(value: unknown): Layout {
  const v = object(value);
  if (!Array.isArray(v.obstacles) || v.obstacles.length > 40)
    fail("Use an obstacles array with at most 40 items.");
  if (!Array.isArray(v.exits) || v.exits.length < 1 || v.exits.length > 8)
    fail("Use 1–8 exits.");
  const obstacles = (v.obstacles as unknown[]).map((item) => {
    const o = object(item);
    const x = number(o.x, 0, WIDTH - CELL, "Obstacle x"),
      y = number(o.y, 0, HEIGHT - CELL, "Obstacle y");
    const w = number(o.w, CELL, WIDTH, "Obstacle width"),
      h = number(o.h, CELL, HEIGHT, "Obstacle depth");
    if (x + w > WIDTH + 1e-7 || y + h > HEIGHT + 1e-7)
      fail("Keep obstacles inside the venue.");
    if ([x, y, w, h].some((n) => Math.abs(n - snap(n)) > 1e-7))
      fail("Obstacle coordinates and sizes must use the 0.6 m grid.");
    return {
      id: label(o.id, "Obstacle ID"),
      label: label(o.label, "Obstacle label"),
      x,
      y,
      w,
      h,
    };
  });
  const exits = (v.exits as unknown[]).map((item) => {
    const e = object(item);
    if (!["east", "west", "north", "south"].includes(e.side as string))
      fail("Exit side must be east, west, north, or south.");
    const side = e.side as Side,
      limit = side === "east" || side === "west" ? HEIGHT : WIDTH;
    const width = number(e.width, 1.2, 6, "Exit width"),
      center = number(e.center, width / 2, limit - width / 2, "Exit position");
    return {
      id: label(e.id, "Exit ID"),
      label: label(e.label, "Exit label"),
      side,
      center,
      width,
    };
  });
  for (const list of [obstacles, exits])
    if (new Set(list.map((i) => i.id)).size !== list.length)
      fail("Every obstacle and exit needs a unique ID within its group.");
  for (let i = 0; i < exits.length; i++)
    for (let j = i + 1; j < exits.length; j++)
      if (
        exits[i].side === exits[j].side &&
        Math.abs(exits[i].center - exits[j].center) <
          (exits[i].width + exits[j].width) / 2
      )
        fail("Exits on the same wall must not overlap.");
  const layout = { name: label(v.name, "Layout name"), obstacles, exits };
  const goals = exitCells(layout, makeGrid(layout));
  if (exits.some((e) => ![...goals.values()].includes(e.id)))
    fail("An exit is blocked. Move obstacles away from its opening.");
  return layout;
}
export function parseProject(text: string): Project {
  if (text.length > 100_000)
    fail("This file is too large. Choose a CrowdFlow JSON file under 100 KB.");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return fail("This is not valid JSON. Choose a saved CrowdFlow layout.");
  }
  const v = object(input);
  if (v.version !== 1)
    fail("Unsupported file version. CrowdFlow expects version 1.");
  const seed = number(v.seed, 0, 4294967295, "Seed"),
    crowd = number(v.crowd, 20, 300, "Crowd");
  if (!Number.isInteger(seed) || !Number.isInteger(crowd))
    fail("Seed and crowd must be whole numbers.");
  return { version: 1, seed, crowd, layout: validateLayout(v.layout) };
}
