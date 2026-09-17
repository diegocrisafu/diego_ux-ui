# CrowdFlow

An interactive crowd venue simulator by Diego Crisafulli. Watch people move through a venue, change the exits and obstacles, then compare both layouts using the same participants.

[Open CrowdFlow](https://diegocrisafu.github.io/diego_ux-ui/) · [Try RoomFit](https://diegocrisafu.github.io/)

## Run locally

Use Node.js 22.13+ (22 LTS) or 24+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, at `/diego_ux-ui/`.

```sh
npm test           # engine, validation, and React interaction tests
npm run lint      # ESLint and React Hooks rules
npm run typecheck # strict TypeScript check
npm run build     # typecheck and optimized static build
npm run preview   # serve the production build locally
npm run benchmark # actual seeded engine timings
npm run deploy    # publish the current source build to GitHub Pages
```

The default public base is `/diego_ux-ui/`. Override it for another host:

```sh
VITE_BASE_PATH=/ npm run build
```

Publish the `dist/` directory using your preferred static hosting workflow. The application uses no backend, API keys, paid services, external fonts, analytics, or account system.

## Explore a venue

1. Choose Exhibition hall, Station terminal, or Concert venue. Each starts with 200 people and seed 721.
2. Play, pause, reset, or change the playback speed. The moving dots are individual simulated participants.
3. Widen an exit, or enter **Edit layout** to draw, add, select, move, rename, resize, and remove rectangular obstacles.
4. Select **Compare layouts**. Both runs use the same participants, speeds, seed, and starting cells. **Try wider exits** provides a quick first experiment.
5. Read the computed clearance time, mean exit time, peak waiting count, remaining participants, and cumulative exit chart. Export the results as CSV.

The original is the selected preset or most recently imported layout. **Restore original layout** discards edits to that venue. **View original** previews the baseline. Changing the crowd or any layout invalidates old comparison results. Layout edits pause and restart the preview.

## Save and load

**Save layout** downloads a versioned JSON file containing the edited layout, crowd, and seed. **Load layout** validates and imports it as the new original. Files are read locally and are never uploaded. Refreshing the page restores the default scenario; download your changes to keep them.

The file contract is in [`public/crowdflow.schema.json`](public/crowdflow.schema.json). Runtime validation also enforces the venue boundary, unique IDs, non-overlapping exit openings, unobstructed exits, a 100 KB input limit, and enough reachable starting cells. Coordinates and rectangular dimensions use a 0.6 m grid. Up to 40 obstacles and eight exits are supported through the file format; the editor changes the current exits' widths.

## Architecture

- `src/simulation/types.ts`: dimensions, time step, parameters, and shared data contracts.
- `src/simulation/grid.ts`: occupancy grid, neighbor connectivity, a binary min-heap, and multi-source Dijkstra flow fields. Diagonal routes cannot cut blocked corners.
- `src/simulation/engine.ts`: deterministic seeded cohort generation, movement, cell reservations, exit capacity, time series, and metrics. It has no React or DOM dependency.
- `src/simulation/scenarios.ts`: authored synthetic presets and the wider-exit experiment.
- `src/simulation/schema.ts`: bounded JSON parsing and runtime geometry validation.
- `src/simulation/compare.worker.ts`: a pair of complete runs in a Web Worker. The UI stays responsive, and cancellation terminates the worker.
- `src/hooks/useSimulation.ts`: a fixed-step accumulator connected to animation frames, with throttled React readouts. Hidden documents pause simulation time; slow frames never change the numerical time step.
- `src/components/VenueCanvas.tsx`: device-pixel-aware drawing and pointer editing with a shared fit-to-canvas coordinate transform.
- `src/components/ComparisonResults.tsx`: computed result table and an SVG chart drawn from run samples.
- `src/App.tsx`: scenario, layout, preview, import/export, and comparison lifecycle.

The preview and worker use the same simulation engine. Simulation speed changes wall-clock playback only, not agent speeds or the fixed 0.05 s step. A rotation of participant processing priority prevents the lowest IDs from always winning cell reservations. A participant reserves both source and destination while moving; diagonal transitions require both adjacent cardinal cells to be free. Participants are rendered as 0.19 m radius discs.

Each exit has a token bucket replenished at `width × 1.3` people per simulated second, with capacity one. Tokens do not accumulate while an exit is idle. A person is recorded as exited on reaching an opening's boundary cell and consuming a token. This quantized capacity model may admit fewer people than its nominal continuous rate.

## Comparison and metric definitions

The cohort is generated once from cells that are free and connected to an exit in **both** layouts. The same IDs, initial cells, and walking speeds are passed to each run. Therefore comparisons are reproducible and preserve the same participants, but their initial crowd placement can differ from the independent single-layout preview. Sealed regions start empty.

- **All people out**: simulated time of the last recorded exit. Reported as not cleared when the 180 s horizon is reached first.
- **Average exit time**: mean recorded exit time among participants who have exited; remaining participants are excluded and reported separately.
- **Peak waiting**: maximum concurrent count of participants stationary for at least one simulated second.
- **Density**: current participant counts within 1.8 × 1.8 m cells, rendered as increasing shade opacity.
- **Cumulative exit chart**: samples once per simulated second, plus the final state.

No performance score, real-world capacity, or safety certification is inferred from these metrics. A changed layout is allowed to produce worse results or fail to clear.

## Validation and measured benchmark

Automated checks cover deterministic replay, obstacle exclusion, physical agent separation during a congested run, monotonic exit counts, per-exit capacity, all three preset completions, identical comparison cohorts, routing around a barrier, horizon handling, valid JSON round trips, malformed/oversized JSON, duplicate IDs, blocked exits, and six React interaction flows. The React tests use a DOM test environment and mocked drawing/worker boundaries; they do not replace real-browser visual or pointer QA.

Local measured benchmark on 17 September 2026, Node 23.11.0, 200 participants, seed 721. Both exits are widened to at least 3.6 m for the edited case. Node 22 LTS or 24+ is recommended; the local Node 23 run passed despite dependency engine warnings.

| Scenario | Original clearance | Wider exits clearance | Compute time, both runs |
| --- | ---: | ---: | ---: |
| Exhibition hall | 86.30 s | 36.90 s | 49.2 ms |
| Station terminal | 65.90 s | 28.30 s | 19.7 ms |
| Concert venue | 82.75 s | 53.80 s | 24.8 ms |

These are engine-only, single-run measurements, not browser frame-rate claims. Computation time depends on hardware, process warm-up, and load. Rerun `npm run benchmark` to measure your environment; simulated clearance times are deterministic for these inputs.

## Accessibility and limitations

Native buttons, selects, and ranges support keyboard operation. Obstacle forms provide a keyboard equivalent to canvas drawing and dragging. Reduced-motion preference starts the simulation paused. The animated canvas has a text alternative; live numeric results, legends, and a semantic comparison table expose the main outcomes without interpreting animation. Desktop playback and comparison actions remain outside the scrollable settings area. The mobile layout stacks the venue before its controls.

The model is educational and deliberately simplified. It uses uniform discs with walking speeds of 0.95–1.45 m/s and a fixed illustrative throughput assumption. It omits acceleration, panic, social groups, mobility needs, smoke, and real human decision-making. Static flow fields do not anticipate changing queues; local reservations can produce grid effects and deadlocks in adversarial layouts. It is not calibrated to a real venue or suitable for evacuation certification. Do not use its results as a life-safety assessment.

See [third-party notices](THIRD_PARTY_NOTICES.md) for the bundled font, framework, and icon licenses.
