import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  FileUp,
  Grid2X2,
  Layers2,
  MousePointer2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  SquareDashedMousePointer,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { VenueCanvas } from "./components/VenueCanvas";
import { ComparisonResults } from "./components/ComparisonResults";
import { useSimulation } from "./hooks/useSimulation";
import { participantsFor } from "./simulation/engine";
import { copyLayout, improveLayout, scenarios } from "./simulation/scenarios";
import { parseProject, snap, validateLayout } from "./simulation/schema";
import {
  CELL,
  HEIGHT,
  WIDTH,
  type Comparison,
  type Layout,
  type Obstacle,
  type Project,
} from "./simulation/types";
import { download } from "./io";

type ObstacleField = "label" | "x" | "y" | "w" | "h";
const obstacleDraft = (obstacle: Obstacle): Record<ObstacleField, string> => ({
  label: obstacle.label,
  x: obstacle.x.toFixed(1),
  y: obstacle.y.toFixed(1),
  w: obstacle.w.toFixed(1),
  h: obstacle.h.toFixed(1),
});

export function ObstacleFields({
  obstacle,
  onCommit,
  onRemove,
}: {
  obstacle: Obstacle;
  onCommit: (patch: Partial<Obstacle>) => boolean;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(() => obstacleDraft(obstacle));
  // Canvas movement or another committed layout change updates the same input nodes.
  useEffect(() => setDraft(obstacleDraft(obstacle)), [obstacle]);

  function commit(field: ObstacleField) {
    const original = obstacleDraft(obstacle)[field];
    const value =
      field === "label" ? draft[field].trim() : Number(draft[field]);
    let normalized = original;
    if (
      draft[field].trim() !== "" &&
      (typeof value === "string" || Number.isFinite(value))
    ) {
      const next = typeof value === "number" ? snap(value) : value;
      if (next === obstacle[field] || onCommit({ [field]: next })) {
        normalized = typeof next === "number" ? next.toFixed(1) : next;
      }
    }
    setDraft((current) => ({ ...current, [field]: normalized }));
  }

  const inputEvents = (field: ObstacleField) => ({
    value: draft[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDraft((current) => ({ ...current, [field]: value }));
    },
    onBlur: () => commit(field),
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit(field);
      }
    },
  });

  return (
    <div className="obstacle-fields">
      <label className="full-field">
        Name
        <input maxLength={60} {...inputEvents("label")} />
      </label>
      {(["x", "y", "w", "h"] as const).map((field) => (
        <label key={field}>
          {{ x: "Left", y: "Top", w: "Width", h: "Depth" }[field]} (m)
          <input
            type="number"
            step="0.6"
            min={field === "w" || field === "h" ? CELL : 0}
            max={field === "x" || field === "w" ? WIDTH : HEIGHT}
            {...inputEvents(field)}
          />
        </label>
      ))}
      <button
        className="text-button delete-obstacle full-field"
        onClick={onRemove}
      >
        <Trash2 size={15} /> Remove obstacle
      </button>
    </div>
  );
}

export default function App() {
  const [scenarioId, setScenarioId] = useState("exhibition");
  const [original, setOriginal] = useState(() =>
    copyLayout(scenarios[0].layout),
  );
  const [layout, setLayout] = useState(() => copyLayout(scenarios[0].layout));
  const [crowd, setCrowd] = useState(200);
  const [seed, setSeed] = useState(721);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState(1);
  const [reset, setReset] = useState(0);
  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState<"select" | "draw">("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState(false);
  const [viewOriginal, setViewOriginal] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Comparison | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const worker = useRef<Worker | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const method = useRef<HTMLDetailsElement>(null);
  const changed = JSON.stringify(layout) !== JSON.stringify(original);
  const shownLayout = viewOriginal ? original : layout;
  const { simulation, metrics } = useSimulation(
    shownLayout,
    crowd,
    seed,
    reset,
    playing && !editing && progress === null,
    speed,
  );
  const selectedObstacle = layout.obstacles.find((o) => o.id === selected);
  useEffect(() => () => worker.current?.terminate(), []);

  function invalidate() {
    worker.current?.terminate();
    worker.current = null;
    setProgress(null);
    setResult(null);
    setError("");
  }
  function applyLayout(
    next: Layout,
    message = "Layout updated. Run it again or compare both layouts.",
  ) {
    try {
      const valid = validateLayout(next);
      participantsFor([valid], crowd, seed);
      invalidate();
      setLayout(valid);
      setPlaying(false);
      setViewOriginal(false);
      setNotice(message);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This layout could not be applied.",
      );
      return false;
    }
  }
  function switchScenario(id: string) {
    const scenario = scenarios.find((s) => s.id === id)!;
    invalidate();
    setScenarioId(id);
    setOriginal(copyLayout(scenario.layout));
    setLayout(copyLayout(scenario.layout));
    setSelected(null);
    setEditing(false);
    setViewOriginal(false);
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setNotice(`${scenario.title} loaded with ${crowd} people.`);
  }
  function changeCrowd(value: number) {
    try {
      participantsFor([layout, original], value, seed);
      invalidate();
      setCrowd(value);
      setPlaying(false);
      setNotice("Crowd changed. Both layouts will use the same people.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function updateObstacle(patch: Partial<Obstacle>) {
    return applyLayout({
      ...layout,
      obstacles: layout.obstacles.map((o) =>
        o.id === selected ? { ...o, ...patch } : o,
      ),
    });
  }
  function addObstacle() {
    const occupied = layout.obstacles;
    for (let y = 1.2; y < HEIGHT - 3.6; y += 1.2)
      for (let x = 1.2; x < WIDTH - 3.6; x += 1.2) {
        if (
          occupied.some(
            (o) =>
              x < o.x + o.w + CELL &&
              x + 2.4 + CELL > o.x &&
              y < o.y + o.h + CELL &&
              y + 2.4 + CELL > o.y,
          )
        )
          continue;
        const obstacle = {
          id: `obstacle-${Date.now()}`,
          label: "New obstacle",
          x: snap(x),
          y: snap(y),
          w: 2.4,
          h: 2.4,
        };
        if (
          applyLayout(
            { ...layout, obstacles: [...layout.obstacles, obstacle] },
            "Obstacle added. Drag it or use the position fields.",
          )
        )
          setSelected(obstacle.id);
        return;
      }
    setError(
      "No clear space for a new obstacle. Remove one or draw a smaller shape.",
    );
  }
  function toggleEditor() {
    setEditing((v) => !v);
    setViewOriginal(false);
    setPlaying(false);
    setNotice(
      editing
        ? "Layout ready. Press Play to see the flow."
        : "Select and drag an obstacle, or draw a new one. Position fields work with a keyboard.",
    );
    setSelected(null);
  }
  function togglePlay() {
    if (metrics.status !== "running") {
      setReset((v) => v + 1);
      setPlaying(true);
    } else setPlaying((v) => !v);
    setEditing(false);
  }
  function compare() {
    invalidate();
    setPlaying(false);
    setEditing(false);
    setProgress(0);
    setNotice("Comparing the same people in both layouts…");
    try {
      const w = new Worker(
        new URL("./simulation/compare.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = w;
      w.onmessage = ({ data }) => {
        if (data.type === "progress") setProgress(data.elapsed);
        if (data.type === "result") {
          setResult(data.result);
          setProgress(null);
          setNotice("Comparison complete. Results are below the venue.");
          w.terminate();
          worker.current = null;
          requestAnimationFrame(() =>
            resultsRef.current?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
              block: "nearest",
            }),
          );
        }
        if (data.type === "error") {
          setError(data.message);
          setProgress(null);
          w.terminate();
          worker.current = null;
        }
      };
      w.onerror = () => {
        setError(
          "The comparison could not run. Reload the page and try again.",
        );
        setProgress(null);
        w.terminate();
        worker.current = null;
      };
      w.postMessage({ original, edited: layout, crowd, seed });
    } catch {
      setProgress(null);
      setError(
        "Your browser could not start the comparison worker. Try a current browser.",
      );
    }
  }
  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    try {
      if (chosen.size > 100_000)
        throw new Error("Choose a CrowdFlow JSON file under 100 KB.");
      const project = parseProject(await chosen.text());
      participantsFor([project.layout], project.crowd, project.seed);
      invalidate();
      setOriginal(copyLayout(project.layout));
      setLayout(project.layout);
      setCrowd(project.crowd);
      setSeed(project.seed);
      setScenarioId("custom");
      setSelected(null);
      setEditing(false);
      setViewOriginal(false);
      setPlaying(false);
      setNotice(
        "Layout loaded. This is now your original for future comparisons.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The file could not be read.");
    }
  }
  function saveLayout() {
    const project: Project = { version: 1, seed, crowd, layout };
    download("crowdflow-layout.json", JSON.stringify(project, null, 2));
    setNotice("Layout saved as a JSON file.");
  }
  const status = editing
    ? "Editing layout"
    : metrics.status === "complete"
      ? "Everyone is out"
      : metrics.status === "horizon"
        ? "Time limit reached"
        : playing
          ? "Simulation running"
          : "Simulation paused";
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to simulator
      </a>
      <header className="site-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="CrowdFlow home"
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          CrowdFlow
          <span className="brand-divider" />
          <span className="brand-subtitle">Space to move.</span>
        </a>
        <nav aria-label="Project actions">
          <button
            className="text-button method-link"
            onClick={() => {
              if (method.current) {
                method.current.open = true;
                method.current.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                });
                method.current.querySelector("summary")?.focus();
              }
            }}
          >
            <CircleHelp size={16} /> How it works
          </button>
          <button className="text-button" onClick={() => file.current?.click()}>
            <FileUp size={16} />
            <span>
              Load<span className="desktop-word"> layout</span>
            </span>
          </button>
          <button className="button secondary save-button" onClick={saveLayout}>
            <Download size={16} />
            <span>
              Save<span className="desktop-word"> layout</span>
            </span>
          </button>
          <input
            className="sr-only"
            tabIndex={-1}
            ref={file}
            type="file"
            accept="application/json,.json"
            aria-label="Load a CrowdFlow layout"
            onChange={loadFile}
          />
        </nav>
      </header>
      <main>
        <div className="intro">
          <div>
            <h1>Make room for better flow.</h1>
            <p>
              See how people move through a venue. Change the layout. Find the
              way through.
            </p>
          </div>
          <span className="intro-note">
            <span className="status-dot" /> Interactive crowd simulator
          </span>
        </div>
        <section
          className="workspace"
          id="workspace"
          aria-label="Crowd simulator"
        >
          <div className="venue-panel">
            <div className="venue-heading">
              <div className="venue-title">
                <Layers2 size={18} />
                <h2>{layout.name}</h2>
                <span className="layout-tag">
                  {changed && !viewOriginal ? "Your layout" : "Original"}
                </span>
              </div>
              <div className="venue-actions">
                {changed && (
                  <button
                    className="text-button"
                    aria-pressed={viewOriginal}
                    onClick={() => {
                      setViewOriginal((v) => !v);
                      setEditing(false);
                      setPlaying(false);
                    }}
                  >
                    {viewOriginal ? "View your layout" : "View original"}
                  </button>
                )}
                <span className="plan-label">TOP VIEW</span>
              </div>
            </div>
            <div className="canvas-wrap">
              <VenueCanvas
                simulation={simulation}
                layout={shownLayout}
                heatmap={heatmap}
                editing={editing}
                tool={tool}
                selected={selected}
                onSelect={setSelected}
                onChange={(obstacles) => applyLayout({ ...layout, obstacles })}
              />
              {editing && (
                <div className="edit-toolbar">
                  <button
                    className={tool === "select" ? "active" : ""}
                    aria-pressed={tool === "select"}
                    onClick={() => setTool("select")}
                  >
                    <MousePointer2 size={15} /> Select & move
                  </button>
                  <button
                    className={tool === "draw" ? "active" : ""}
                    aria-pressed={tool === "draw"}
                    onClick={() => setTool("draw")}
                  >
                    <SquareDashedMousePointer size={15} /> Draw obstacle
                  </button>
                  <button onClick={addObstacle}>
                    <Plus size={15} /> Add
                  </button>
                </div>
              )}
            </div>
            <div className="canvas-legend">
              <div>
                <span>
                  <i className="legend-dot moving" /> Moving
                </span>
                <span>
                  <i className="legend-dot waiting" /> Waiting
                </span>
                <span>
                  <i className="exit-key" /> Exit
                </span>
                {heatmap && (
                  <span className="heat-legend">Density: light → dark</span>
                )}
              </div>
            </div>
            <div className="transport">
              <div className="playback">
                <button
                  className="button primary play-button"
                  onClick={togglePlay}
                  disabled={progress !== null}
                >
                  {playing && !editing && metrics.status === "running" ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" />
                  )}
                  {metrics.status !== "running"
                    ? "Replay"
                    : playing && !editing
                      ? "Pause"
                      : "Play"}
                </button>
                <button
                  className="icon-button"
                  title="Reset simulation"
                  aria-label="Reset simulation"
                  onClick={() => {
                    setReset((v) => v + 1);
                    setPlaying(false);
                    setNotice(
                      "Simulation reset to the same starting positions.",
                    );
                  }}
                >
                  <RotateCcw size={17} />
                </button>
                <div className="speed-control" aria-label="Simulation speed">
                  {[1, 2, 4].map((s) => (
                    <button
                      key={s}
                      className={speed === s ? "active" : ""}
                      aria-label={`${s} times speed`}
                      aria-pressed={speed === s}
                      onClick={() => setSpeed(s)}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
              <div className="view-controls">
                <button
                  className={`button quiet ${heatmap ? "is-active" : ""}`}
                  aria-pressed={heatmap}
                  onClick={() => setHeatmap((v) => !v)}
                >
                  <Grid2X2 size={16} />
                  <span>Density</span>
                </button>
                <button
                  className={`button quiet ${editing ? "is-active" : ""}`}
                  aria-pressed={editing}
                  onClick={toggleEditor}
                >
                  <SlidersHorizontal size={16} />
                  <span>{editing ? "Finish editing" : "Edit layout"}</span>
                </button>
              </div>
            </div>
            <div className="run-readout">
              <div className="run-status">
                <span
                  className={`status-dot ${playing && !editing && metrics.status === "running" ? "running" : "paused"}`}
                />
                <span>{status}</span>
              </div>
              <dl>
                <div>
                  <dt>Elapsed</dt>
                  <dd>
                    {metrics.elapsed.toFixed(1)}
                    <small> s</small>
                  </dd>
                </div>
                <div>
                  <dt>Reached an exit</dt>
                  <dd>
                    {metrics.exited}
                    <small> / {crowd}</small>
                  </dd>
                </div>
                <div>
                  <dt>Still inside</dt>
                  <dd>{metrics.remaining}</dd>
                </div>
              </dl>
            </div>
          </div>
          <aside className="control-panel" aria-label="Layout settings">
            <div className="settings-scroll">
              <div className="controls-heading">
                <h2>Shape the flow</h2>
                <span>Synthetic scenario</span>
              </div>
              <div className="control-section">
                <label className="field-label" htmlFor="scenario">
                  Venue
                </label>
                <div className="select-wrap">
                  <select
                    id="scenario"
                    value={scenarioId}
                    onChange={(e) => switchScenario(e.target.value)}
                  >
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                    {scenarioId === "custom" && (
                      <option value="custom">Imported layout</option>
                    )}
                  </select>
                  <ChevronDown size={16} />
                </div>
                <p className="field-help">
                  {scenarios.find((s) => s.id === scenarioId)?.subtitle ??
                    "Your saved venue configuration"}
                </p>
              </div>
              <div className="control-section">
                <div className="field-heading">
                  <label className="field-label" htmlFor="crowd">
                    <Users size={16} /> People in the venue
                  </label>
                  <output htmlFor="crowd">{crowd}</output>
                </div>
                <input
                  id="crowd"
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={crowd}
                  onChange={(e) => changeCrowd(+e.target.value)}
                />
                <div className="range-labels">
                  <span>20 people</span>
                  <span>300</span>
                </div>
              </div>
              <div className="control-section exits-section">
                <div className="field-heading">
                  <h3>Exit widths</h3>
                  <span>meters</span>
                </div>
                {layout.exits.map((exit, i) => (
                  <div className="exit-control" key={exit.id}>
                    <div className="exit-control-label">
                      <span className="exit-letter">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <label htmlFor={`exit-${exit.id}`}>{exit.label}</label>
                      <output htmlFor={`exit-${exit.id}`}>
                        {exit.width.toFixed(1)}
                        <small> m</small>
                      </output>
                    </div>
                    <input
                      id={`exit-${exit.id}`}
                      type="range"
                      min="1.2"
                      max={Math.min(
                        6,
                        exit.center * 2,
                        ((exit.side === "east" || exit.side === "west"
                          ? HEIGHT
                          : WIDTH) -
                          exit.center) *
                          2,
                      )}
                      step="0.6"
                      value={exit.width}
                      onChange={(e) =>
                        applyLayout(
                          {
                            ...layout,
                            exits: layout.exits.map((x) =>
                              x.id === exit.id
                                ? { ...x, width: +e.target.value }
                                : x,
                            ),
                          },
                          "Exit width updated. Compare layouts to measure the difference.",
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              {editing && (
                <div className="control-section obstacle-editor">
                  <div className="field-heading">
                    <h3>Obstacles</h3>
                    <button
                      className="icon-button"
                      aria-label="Add an obstacle"
                      onClick={addObstacle}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <label className="sr-only" htmlFor="obstacle">
                    Select obstacle
                  </label>
                  <select
                    id="obstacle"
                    value={selected ?? ""}
                    onChange={(e) => setSelected(e.target.value || null)}
                  >
                    <option value="">Choose an obstacle</option>
                    {layout.obstacles.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {selectedObstacle ? (
                    <ObstacleFields
                      key={selectedObstacle.id}
                      obstacle={selectedObstacle}
                      onCommit={updateObstacle}
                      onRemove={() => {
                        if (applyLayout({ ...layout, obstacles: layout.obstacles.filter((o) => o.id !== selected) }, "Obstacle removed.")) setSelected(null);
                      }}
                    />
                  ) : (
                    <p className="field-help">
                      Select a shape on the plan or in this list. Drag to move;
                      draw to add. Changes snap to 0.6 m.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="comparison-control">
              <h3>What changes with your layout?</h3>
              <p>Run both versions with the same people and starting points.</p>
              {progress === null ? (
                <button
                  className="button primary compare-button"
                  onClick={
                    changed || JSON.stringify(improveLayout(layout)) === JSON.stringify(layout)
                      ? compare
                      : () => applyLayout(
                          improveLayout(layout),
                          "Exits widened to at least 3.6 m. Now compare to see what changes.",
                        )
                  }
                >
                  <span>{changed || JSON.stringify(improveLayout(layout)) === JSON.stringify(layout) ? "Compare layouts" : "Try wider exits"}</span>
                  {changed ? <ArrowRight size={17} /> : <ArrowUpRight size={17} />}
                </button>
              ) : (
                <button
                  className="button secondary compare-button"
                  onClick={() => {
                    invalidate();
                    setNotice("Comparison cancelled.");
                  }}
                >
                  <span>Comparing · {progress.toFixed(0)} s</span>
                  <X size={17} />
                  <span className="sr-only">Cancel</span>
                </button>
              )}
              {changed && (
                <button
                  className="text-button restore-button"
                  onClick={() => {
                    applyLayout(
                      copyLayout(original),
                      "Original layout restored.",
                    );
                    setSelected(null);
                  }}
                >
                  <RotateCcw size={13} /> Restore original layout
                </button>
              )}
              {!changed && (
                <p className="comparison-hint">
                  Change an exit or obstacle, then compare the flow.
                </p>
              )}
            </div>
          </aside>
        </section>
        <div className="status-line" role="status" aria-live="polite">
          {notice ? (
            <>
              <Check size={14} />
              <span>{notice}</span>
            </>
          ) : (
            <>
              <MousePointer2 size={14} />
              <span>
                Start exploring: widen an exit, move an obstacle, or try a
                different venue.
              </span>
            </>
          )}
        </div>
        {error && (
          <div className="error-message" role="alert">
            <strong>That change couldn’t be applied.</strong>
            <span>{error}</span>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}
        <div ref={resultsRef}>
          {result && <ComparisonResults result={result} />}
        </div>
        <details className="method-details" ref={method}>
          <summary>
            <span>
              <CircleHelp size={17} /> A model for exploring, not an evacuation
              forecast.
            </span>
            <span className="method-summary-label">
              Method & keyboard controls <Plus size={16} />
            </span>
          </summary>
          <div className="method-content">
            <div>
              <h2>How the simulation works</h2>
              <p>
                Each dot is a person moving toward a reachable exit. People
                navigate around obstacles on a 0.6 m grid, reserve space to
                avoid overlapping, and walk at seeded speeds of 0.95–1.45 m/s.
                Exit throughput is limited to 1.3 people per meter per second,
                an illustrative assumption.
              </p>
              <p>
                Density shades count people in 1.8 × 1.8 m cells; darker cells
                contain more people. Amber dots have been stationary for at
                least 1 second. A run stops when everyone exits, or after 180
                simulated seconds.
              </p>
              <p>
                This simplified model omits acceleration, panic, groups,
                mobility needs, smoke, and real human decisions. It is not
                calibrated to a real venue, certified for life safety, or a
                substitute for professional assessment.
              </p>
            </div>
            <div>
              <h2>A fair comparison</h2>
              <p>
                Both runs use the same seed, participant IDs, speeds, and
                starting positions. Starting points are sampled only from cells
                that are free and connected to an exit in both layouts; sealed
                areas start empty. A comparison may therefore start differently
                from a single-layout preview.
              </p>
              <p>
                Use Tab to reach every control, arrow keys on sliders, and Space
                or Enter on buttons. In edit mode, the obstacle list and
                position fields provide a keyboard equivalent to drawing and
                dragging. Field edits apply on leaving the field or pressing
                Enter.
              </p>
              <label className="seed-field">
                Simulation seed
                <input
                  type="number"
                  min="0"
                  max="4294967295"
                  step="1"
                  key={seed}
                  defaultValue={seed}
                  onBlur={(e) => {
                    const value = +e.target.value;
                    if (
                      e.target.value &&
                      Number.isInteger(value) &&
                      value >= 0 &&
                      value <= 4294967295
                    ) {
                      if (seed !== value) {
                        invalidate();
                        setSeed(value);
                        setPlaying(false);
                        setNotice("Seed updated for both layouts.");
                      }
                    } else {
                      e.target.value = String(seed);
                      setError(
                        "Seed must be a whole number from 0 to 4294967295.",
                      );
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              </label>
              <p>
                Layouts stay in your browser until you download them. No
                account, analytics, or server upload.
              </p>
            </div>
          </div>
        </details>
      </main>
      <footer className="site-footer">
        <span>
          CrowdFlow <span className="footer-separator" aria-hidden="true">/</span> Built by Diego Crisafulli
        </span>
        <span><a href="https://github.com/diegocrisafu/diego_ux-ui">Source code</a> <span aria-hidden="true"> · </span> <a href="https://diegocrisafu.github.io/">Try RoomFit</a></span>
      </footer>
    </>
  );
}
