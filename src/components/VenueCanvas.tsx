import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  CELL,
  HEIGHT,
  WIDTH,
  type Layout,
  type Obstacle,
} from "../simulation/types";
import type { Simulation } from "../simulation/engine";
import { snap } from "../simulation/schema";

const PAD = 2.1;
const VW = WIDTH + PAD * 2,
  VH = HEIGHT + PAD * 2;
interface Props {
  simulation: Simulation;
  layout: Layout;
  heatmap: boolean;
  editing: boolean;
  tool: "select" | "draw";
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (obstacles: Obstacle[]) => void;
}
interface Gesture {
  x: number;
  y: number;
  obstacle?: Obstacle;
}
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

function drawVenue(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixelRatio: number,
  props: Props,
  ghost: Obstacle | null,
) {
  const scale = Math.min(width / VW, height / VH);
  if (scale <= 0) return;
  // Geometry uses venue meters; annotations retain their CSS-pixel size.
  const screenUnit = pixelRatio / scale;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fcfbf7";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate((width - VW * scale) / 2, (height - VH * scale) / 2);
  ctx.scale(scale, scale);
  ctx.translate(PAD, PAD);
  ctx.fillStyle = "#fcfbf7";
  ctx.fillRect(-PAD, -PAD, VW, VH);
  ctx.fillStyle = "#e4e6df";
  for (let x = 0; x <= WIDTH; x += 1.2)
    for (let y = 0; y <= HEIGHT; y += 1.2) {
      ctx.beginPath();
      ctx.arc(x, y, 0.025, 0, Math.PI * 2);
      ctx.fill();
    }
  if (props.heatmap) {
    const cells = new Map<string, number>();
    for (const a of props.simulation.agents)
      if (a.exitTime === null) {
        const key = `${Math.floor(a.x / 1.8)},${Math.floor(a.y / 1.8)}`;
        cells.set(key, (cells.get(key) ?? 0) + 1);
      }
    for (const [key, n] of cells) {
      const [x, y] = key.split(",").map(Number);
      ctx.fillStyle = `rgba(213, 112, 35, ${Math.min(n / 12, 0.6)})`;
      ctx.fillRect(
        x * 1.8,
        y * 1.8,
        Math.min(1.8, WIDTH - x * 1.8),
        Math.min(1.8, HEIGHT - y * 1.8),
      );
    }
  }
  ctx.lineWidth = 0.12;
  ctx.strokeStyle = "#253c47";
  ctx.strokeRect(0, 0, WIDTH, HEIGHT);
  ctx.font = `500 ${12 * screenUnit}px "Manrope Variable", sans-serif`;
  ctx.fillStyle = "#65716f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${WIDTH.toFixed(1)} m`, WIDTH / 2, -0.9);
  ctx.save();
  ctx.translate(
    -1.05,
    props.layout.exits.some((exit) => exit.side === "west")
      ? HEIGHT * 0.22
      : HEIGHT / 2,
  );
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${HEIGHT.toFixed(1)} m`, 0, 0);
  ctx.restore();
  for (const obstacle of props.layout.obstacles) {
    const o = ghost?.id === obstacle.id ? ghost : obstacle;
    const selected = props.editing && props.selected === o.id;
    ctx.fillStyle = selected ? "#e3eaff" : "#e5e7e1";
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = selected ? "#245bea" : "#abb4ac";
    ctx.lineWidth = selected ? 0.1 : 0.045;
    ctx.strokeRect(o.x, o.y, o.w, o.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(o.x, o.y, o.w, o.h);
    ctx.clip();
    ctx.strokeStyle = selected ? "#ccd7fa" : "#d5dad2";
    ctx.lineWidth = 0.025;
    for (let offset = -o.h; offset < o.w; offset += 0.4) {
      ctx.beginPath();
      ctx.moveTo(o.x + offset, o.y);
      ctx.lineTo(o.x + offset + o.h, o.y + o.h);
      ctx.stroke();
    }
    ctx.restore();
    const rotateLabel = o.h > o.w * 1.3;
    const availableWidth = (rotateLabel ? o.h : o.w) - 6 * screenUnit;
    const availableHeight = rotateLabel ? o.w : o.h;
    if (
      availableWidth >= 7 * screenUnit &&
      availableHeight >= 14 * screenUnit
    ) {
      ctx.save();
      ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
      if (rotateLabel) ctx.rotate(-Math.PI / 2);
      ctx.font = `600 ${11 * screenUnit}px "Manrope Variable", sans-serif`;
      let label = o.label;
      if (ctx.measureText(label).width > availableWidth) {
        label = label
          .replace(/^Exhibit /i, "")
          .replace(/^Platform /i, "P")
          .replace(/^(Welcome|Main|Sound) /i, "");
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
      if (ctx.measureText(label).width > availableWidth) {
        while (
          label.length > 1 &&
          ctx.measureText(label + "…").width > availableWidth
        )
          label = label.slice(0, -1);
        label += "…";
        if (ctx.measureText(label).width > availableWidth)
          label = o.label.charAt(0).toUpperCase();
      }
      const labelWidth = ctx.measureText(label).width + 4 * screenUnit;
      ctx.fillStyle = selected ? "#e3eaff" : "#e5e7e1";
      ctx.fillRect(
        -labelWidth / 2,
        -7 * screenUnit,
        labelWidth,
        14 * screenUnit,
      );
      ctx.fillStyle = "#40544e";
      // Never pass maxWidth: Canvas would horizontally shrink otherwise readable text.
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    if (selected) {
      ctx.fillStyle = "#245bea";
      for (const [x, y] of [
        [o.x, o.y],
        [o.x + o.w, o.y],
        [o.x, o.y + o.h],
        [o.x + o.w, o.y + o.h],
      ])
        ctx.fillRect(x - 0.12, y - 0.12, 0.24, 0.24);
    }
  }
  if (ghost && !props.layout.obstacles.some((o) => o.id === ghost.id)) {
    ctx.fillStyle = "#245bea25";
    ctx.fillRect(ghost.x, ghost.y, ghost.w, ghost.h);
    ctx.strokeStyle = "#245bea";
    ctx.lineWidth = 0.08;
    ctx.strokeRect(ghost.x, ghost.y, ghost.w, ghost.h);
  }
  for (const [exitIndex, exit] of props.layout.exits.entries()) {
    const vertical = exit.side === "east" || exit.side === "west";
    const x = vertical ? (exit.side === "east" ? WIDTH : 0) : exit.center;
    const y = vertical ? exit.center : exit.side === "south" ? HEIGHT : 0;
    ctx.strokeStyle = "#fcfbf7";
    ctx.lineWidth = 0.25;
    ctx.beginPath();
    ctx.moveTo(
      x - (vertical ? 0 : exit.width / 2),
      y - (vertical ? exit.width / 2 : 0),
    );
    ctx.lineTo(
      x + (vertical ? 0 : exit.width / 2),
      y + (vertical ? exit.width / 2 : 0),
    );
    ctx.stroke();
    ctx.strokeStyle = "#17856d";
    ctx.lineWidth = 0.13;
    ctx.stroke();
    const angle =
      exit.side === "east"
        ? 0
        : exit.side === "south"
          ? Math.PI / 2
          : exit.side === "west"
            ? Math.PI
            : -Math.PI / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = "#17856d";
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.moveTo(0.15, 0);
    ctx.lineTo(0.55, 0);
    ctx.moveTo(0.35, -0.15);
    ctx.lineTo(0.55, 0);
    ctx.lineTo(0.35, 0.15);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#17654f";
    ctx.font = `700 ${11 * screenUnit}px "Manrope Variable", sans-serif`;
    const exitLabel = `${String.fromCharCode(65 + exitIndex)} · ${exit.width.toFixed(1)} m`;
    if (vertical) {
      ctx.save();
      ctx.translate(x + (exit.side === "east" ? 1.4 : -1.4), y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(exitLabel, 0, 0);
      ctx.restore();
    } else ctx.fillText(exitLabel, x, y + (exit.side === "south" ? 1.4 : -1.4));
  }
  for (const a of props.simulation.agents) {
    if (a.exitTime !== null) continue;
    ctx.fillStyle =
      a.waited >= 1 ? "#b76424" : a.id % 5 === 0 ? "#287e80" : "#243f56";
    ctx.beginPath();
    ctx.arc(a.x, a.y, 0.19, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
export function VenueCanvas(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ghost, setGhost] = useState<Obstacle | null>(null);
  const gesture = useRef<Gesture | null>(null);
  useEffect(() => {
    const node = canvas.current!;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    let frame = 0,
      lastTick = -1,
      dirty = true,
      pixelRatio = 1;
    const resize = () => {
      const rect = node.getBoundingClientRect(),
        dpr = Math.min(window.devicePixelRatio || 1, 2);
      pixelRatio = dpr;
      node.width = Math.round(rect.width * dpr);
      node.height = Math.round(rect.height * dpr);
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    const draw = () => {
      if (dirty || lastTick !== props.simulation.tick) {
        drawVenue(ctx, node.width, node.height, pixelRatio, props, ghost);
        lastTick = props.simulation.tick;
        dirty = false;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    void document.fonts.ready.then(() => {
      dirty = true;
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [props, ghost]);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(bounds.width / VW, bounds.height / VH);
    return {
      x: clamp(
        (event.clientX - bounds.left - (bounds.width - VW * scale) / 2) /
          scale -
          PAD,
        0,
        WIDTH,
      ),
      y: clamp(
        (event.clientY - bounds.top - (bounds.height - VH * scale) / 2) /
          scale -
          PAD,
        0,
        HEIGHT,
      ),
    };
  };
  const onDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!props.editing) return;
    const p = point(event),
      hit = [...props.layout.obstacles]
        .reverse()
        .find(
          (o) =>
            p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h,
        );
    event.currentTarget.setPointerCapture(event.pointerId);
    if (props.tool === "select") {
      props.onSelect(hit?.id ?? null);
      gesture.current = hit ? { ...p, obstacle: hit } : null;
    } else gesture.current = { x: snap(p.x), y: snap(p.y) };
  };
  const onMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current;
    if (!g) return;
    const p = point(event);
    if (g.obstacle)
      setGhost({
        ...g.obstacle,
        x: snap(clamp(g.obstacle.x + p.x - g.x, 0, WIDTH - g.obstacle.w)),
        y: snap(clamp(g.obstacle.y + p.y - g.y, 0, HEIGHT - g.obstacle.h)),
      });
    else {
      const x = snap(p.x),
        y = snap(p.y);
      setGhost({
        id: "draft",
        label: "New obstacle",
        x: Math.min(x, g.x),
        y: Math.min(y, g.y),
        w: Math.max(CELL, Math.abs(x - g.x)),
        h: Math.max(CELL, Math.abs(y - g.y)),
      });
    }
  };
  const onUp = () => {
    if (ghost) {
      if (gesture.current?.obstacle)
        props.onChange(
          props.layout.obstacles.map((o) => (o.id === ghost.id ? ghost : o)),
        );
      else {
        const o = { ...ghost, id: `obstacle-${Date.now()}` };
        props.onChange([...props.layout.obstacles, o]);
        props.onSelect(o.id);
      }
    }
    gesture.current = null;
    setGhost(null);
  };
  return (
    <canvas
      ref={canvas}
      className={`venue-canvas ${props.editing ? `is-editing tool-${props.tool}` : ""}`}
      style={{ aspectRatio: `${VW} / ${VH}` }}
      aria-label={`${props.layout.name} venue. ${props.simulation.agents.length - props.simulation.exited} people remain, ${props.simulation.exited} have reached an exit. Use the layout controls to edit obstacles.`}
      role="img"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => {
        gesture.current = null;
        setGhost(null);
      }}
    >
      Your browser does not support the venue canvas. Live results and all
      layout controls remain available below.
    </canvas>
  );
}
