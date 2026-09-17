import { CELL, COLS, ROWS, WIDTH, HEIGHT, RADIUS, type Layout } from "./types";
export const position = (cell: number) => ({
  x: ((cell % COLS) + 0.5) * CELL,
  y: (Math.floor(cell / COLS) + 0.5) * CELL,
});
export const cellAt = (x: number, y: number) =>
  Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL))) * COLS +
  Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL)));
export function isFree(layout: Layout, x: number, y: number, radius = RADIUS) {
  return (
    x >= radius &&
    y >= radius &&
    x <= WIDTH - radius &&
    y <= HEIGHT - radius &&
    !layout.obstacles.some(
      (o) =>
        x + radius > o.x + 1e-8 &&
        x - radius < o.x + o.w - 1e-8 &&
        y + radius > o.y + 1e-8 &&
        y - radius < o.y + o.h - 1e-8,
    )
  );
}
export function makeGrid(layout: Layout) {
  const blocked = new Uint8Array(COLS * ROWS);
  for (let cell = 0; cell < blocked.length; cell++) {
    const p = position(cell);
    blocked[cell] = isFree(layout, p.x, p.y) ? 0 : 1;
  }
  return blocked;
}
export function neighbors(cell: number, blocked: Uint8Array): number[] {
  const x = cell % COLS,
    y = Math.floor(cell / COLS),
    out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (
        (!dx && !dy) ||
        x + dx < 0 ||
        x + dx >= COLS ||
        y + dy < 0 ||
        y + dy >= ROWS
      )
        continue;
      const n = cell + dx + dy * COLS;
      if (
        blocked[n] ||
        (dx && dy && (blocked[cell + dx] || blocked[cell + dy * COLS]))
      )
        continue;
      out.push(n);
    }
  return out;
}
export function exitCells(layout: Layout, blocked: Uint8Array) {
  const goals = new Map<number, string>();
  for (const exit of layout.exits) {
    const vertical = exit.side === "east" || exit.side === "west";
    for (let i = 0; i < (vertical ? ROWS : COLS); i++) {
      if (
        Math.abs((i + 0.5) * CELL - exit.center) >
        exit.width / 2 - RADIUS + 1e-8
      )
        continue;
      const cell = vertical
        ? i * COLS + (exit.side === "east" ? COLS - 1 : 0)
        : i + (exit.side === "south" ? (ROWS - 1) * COLS : 0);
      if (!blocked[cell]) goals.set(cell, exit.id);
    }
  }
  return goals;
}
class MinHeap {
  data: [number, number][] = [];
  push(item: [number, number]) {
    let i = this.data.length;
    this.data.push(item);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p][1] <= item[1]) break;
      this.data[i] = this.data[p];
      i = p;
    }
    this.data[i] = item;
  }
  pop() {
    const first = this.data[0],
      last = this.data.pop()!;
    if (this.data.length) {
      let i = 0;
      while (i * 2 + 1 < this.data.length) {
        let c = i * 2 + 1;
        if (c + 1 < this.data.length && this.data[c + 1][1] < this.data[c][1])
          c++;
        if (this.data[c][1] >= last[1]) break;
        this.data[i] = this.data[c];
        i = c;
      }
      this.data[i] = last;
    }
    return first;
  }
}
export function flowField(blocked: Uint8Array, goals: Map<number, string>) {
  const distance = new Float64Array(blocked.length).fill(Infinity),
    heap = new MinHeap();
  for (const cell of goals.keys()) {
    distance[cell] = 0;
    heap.push([cell, 0]);
  }
  while (heap.data.length) {
    const [cell, cost] = heap.pop();
    if (cost > distance[cell]) continue;
    for (const n of neighbors(cell, blocked)) {
      const next =
        cost +
        (n % COLS !== cell % COLS &&
        Math.floor(n / COLS) !== Math.floor(cell / COLS)
          ? Math.SQRT2
          : 1);
      if (next < distance[n]) {
        distance[n] = next;
        heap.push([n, next]);
      }
    }
  }
  return distance;
}
