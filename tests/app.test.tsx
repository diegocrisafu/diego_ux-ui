// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App, { ObstacleFields } from "../src/App";
import userEvent from "@testing-library/user-event";
import { scenarios } from "../src/simulation/scenarios";

const posted: unknown[] = [];
class TestWorker {
  onmessage: ((message: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage(data: unknown) {
    posted.push(data);
  }
  terminate() {}
}
beforeEach(() => {
  posted.length = 0;
  vi.stubGlobal("Worker", TestWorker);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: true }),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("simulator controls", () => {
  it("starts paused for reduced motion and exposes the core controls", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Make room for better flow.",
    );
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "200 people remain",
    );
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });
  it("compares the original and changed layout with the same crowd and seed", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Try wider exits" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare layouts" }));
    const data = posted[0] as {
      seed: number;
      crowd: number;
      original: { exits: { width: number }[] };
      edited: { exits: { width: number }[] };
    };
    expect(data.seed).toBe(721);
    expect(data.crowd).toBe(200);
    expect(data.original.exits[0].width).toBe(1.2);
    expect(data.edited.exits[0].width).toBe(3.6);
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(
      screen.getByRole("button", { name: "Compare layouts" }),
    ).toBeTruthy();
  });
  it("changes venue and resets the original comparison layout", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Venue"), {
      target: { value: "terminal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Try wider exits" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare layouts" }));
    expect((posted[0] as { original: { name: string } }).original.name).toBe(
      "Station terminal",
    );
  });
  it("adds, renames, moves and deletes an obstacle using form controls", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Edit layout" }));
    fireEvent.click(screen.getByRole("button", { name: "Add an obstacle" }));
    const name = screen.getByLabelText("Name");
    fireEvent.change(name, { target: { value: "Information desk" } });
    fireEvent.blur(name);
    const x = screen.getByLabelText("Left (m)");
    fireEvent.change(x, { target: { value: "2.4" } });
    fireEvent.blur(x);
    expect(
      screen.getByRole("option", { name: "Information desk" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove obstacle" }));
    expect(
      screen.queryByRole("option", { name: "Information desk" }),
    ).toBeNull();
  });
  it("keeps Tab focus through consecutive committed obstacle edits and Enter", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Edit layout" }));
    await user.selectOptions(screen.getByLabelText("Select obstacle"), "a");
    const name = screen.getByLabelText("Name");
    const left = screen.getByLabelText("Left (m)");
    const top = screen.getByLabelText("Top (m)");
    const width = screen.getByLabelText("Width (m)");
    const depth = screen.getByLabelText("Depth (m)");
    await user.click(name);
    await user.clear(name);
    await user.type(name, "North exhibit");
    await user.tab();
    expect(document.activeElement).toBe(left);
    expect(screen.getByLabelText("Name")).toBe(name);
    await user.clear(left);
    await user.type(left, "7.2");
    await user.tab();
    expect(document.activeElement).toBe(top);
    await user.clear(top);
    await user.type(top, "4.2");
    await user.tab();
    expect(document.activeElement).toBe(width);
    await user.clear(width);
    await user.type(width, "4.8{Enter}");
    expect(document.activeElement).toBe(width);
    await user.tab();
    expect(document.activeElement).toBe(depth);
    await user.click(screen.getByRole("button", { name: "Compare layouts" }));
    const request = posted[0] as {
      edited: {
        obstacles: {
          id: string;
          label: string;
          x: number;
          y: number;
          w: number;
        }[];
      };
    };
    const edited = request.edited.obstacles.find((o) => o.id === "a")!;
    expect(edited.label).toBe("North exhibit");
    expect(edited.x).toBeCloseTo(7.2);
    expect(edited.y).toBeCloseTo(4.2);
    expect(edited.w).toBeCloseTo(4.8);
  });
  it("synchronizes external canvas changes without replacing the field nodes", () => {
    const obstacle = scenarios[0].layout.obstacles[0];
    const onCommit = vi.fn(() => true);
    const onRemove = vi.fn();
    const { rerender } = render(
      <ObstacleFields
        obstacle={obstacle}
        onCommit={onCommit}
        onRemove={onRemove}
      />,
    );
    const left = screen.getByLabelText("Left (m)") as HTMLInputElement;
    const top = screen.getByLabelText("Top (m)") as HTMLInputElement;
    left.focus();
    rerender(
      <ObstacleFields
        obstacle={{ ...obstacle, x: 10.8, y: 8.4 }}
        onCommit={onCommit}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByLabelText("Left (m)")).toBe(left);
    expect(left.value).toBe("10.8");
    expect(top.value).toBe("8.4");
    expect(document.activeElement).toBe(left);
    expect(onCommit).not.toHaveBeenCalled();
  });
  it("restores the original exit width after an edit", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Try wider exits" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Restore original layout" }),
    );
    expect((screen.getByLabelText("Main exit") as HTMLInputElement).value).toBe(
      "1.2",
    );
    expect(screen.queryByRole("button", { name: "View original" })).toBeNull();
  });
  it("rejects an invalid uploaded layout without replacing the working scene", async () => {
    render(<App />);
    const input = screen.getByLabelText("Load a CrowdFlow layout");
    fireEvent.change(input, {
      target: { files: [{ size: 6, text: async () => "broken" }] },
    });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "not valid JSON",
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Exhibition hall",
    );
  });
});
