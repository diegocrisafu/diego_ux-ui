// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { VenueCanvas } from "../src/components/VenueCanvas";
import { Simulation, participantsFor } from "../src/simulation/engine";
import { scenarios } from "../src/simulation/scenarios";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("canvas annotation sizing", () => {
  it.each([
    [850, 300, 1],
    [333, 235, 2],
  ])(
    "keeps labels at screen size for a %s × %s canvas at DPR %s",
    (width, height, pixelRatio) => {
      const labels: { text: string; pixels: number; argumentCount: number }[] =
        [];
      const frames: FrameRequestCallback[] = [];
      let scale = 1;
      const stack: { scale: number; font: string }[] = [];
      const ctx = {
        font: "10px sans-serif",
        save() {
          stack.push({ scale, font: this.font });
        },
        restore() {
          const previous = stack.pop()!;
          scale = previous.scale;
          this.font = previous.font;
        },
        scale(x: number) {
          scale *= x;
        },
        measureText(text: string) {
          return {
            width:
              text.length * Number(this.font.match(/([\d.]+)px/)![1]) * 0.55,
          };
        },
        fillText(...args: [string, number, number, number?]) {
          labels.push({
            text: args[0],
            pixels:
              (Number(this.font.match(/([\d.]+)px/)![1]) * scale) / pixelRatio,
            argumentCount: args.length,
          });
        },
        clearRect() {},
        fillRect() {},
        translate() {},
        beginPath() {},
        arc() {},
        fill() {},
        strokeRect() {},
        rotate() {},
        rect() {},
        clip() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
      };
      vi.stubGlobal(
        "ResizeObserver",
        class {
          observe() {}
          disconnect() {}
        },
      );
      vi.stubGlobal(
        "requestAnimationFrame",
        (callback: FrameRequestCallback) => {
          frames.push(callback);
          return frames.length;
        },
      );
      vi.stubGlobal("cancelAnimationFrame", () => undefined);
      Object.defineProperty(window, "devicePixelRatio", {
        configurable: true,
        value: pixelRatio,
      });
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: { ready: Promise.resolve() },
      });
      vi.spyOn(
        HTMLCanvasElement.prototype,
        "getBoundingClientRect",
      ).mockReturnValue({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON() {},
      });
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );
      const layout = scenarios[0].layout;
      render(
        <VenueCanvas
          layout={layout}
          simulation={
            new Simulation(layout, participantsFor([layout], 20, 721))
          }
          heatmap={false}
          editing={false}
          tool="select"
          selected={null}
          onSelect={() => {}}
          onChange={() => {}}
        />,
      );
      frames.shift()!(0);
      expect(labels.map((label) => label.text)).toEqual(
        expect.arrayContaining(["32.4 m", "21.6 m", "A · 1.2 m", "B · 1.2 m"]),
      );
      expect(labels.length).toBeGreaterThan(4);
      for (const label of labels) {
        expect(label.pixels).toBeGreaterThanOrEqual(11 - 1e-8);
        expect(label.pixels).toBeLessThanOrEqual(12 + 1e-8);
        expect(label.argumentCount).toBe(3);
      }
    },
  );
});
