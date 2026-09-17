import type { Comparison } from "./simulation/types";
export function download(
  filename: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function comparisonCSV(c: Comparison): string {
  const rows: (string | number | null)[][] = [
    ["CrowdFlow educational simulation; not an evacuation assessment"],
    ["seed", c.seed],
    ["crowd", c.crowd],
    ["measure", "original", "edited"],
    [
      "clearance_seconds",
      c.before.metrics.clearance,
      c.after.metrics.clearance,
    ],
    [
      "mean_exit_seconds_exited_only",
      c.before.metrics.meanExitTime,
      c.after.metrics.meanExitTime,
    ],
    [
      "peak_stationary_at_least_1s",
      c.before.metrics.peakQueue,
      c.after.metrics.peakQueue,
    ],
    ["remaining", c.before.metrics.remaining, c.after.metrics.remaining],
    [],
    ["run", "time_seconds", "exited", "queued"],
    ...c.before.series.map((s) => ["original", s.time, s.exited, s.queued]),
    ...c.after.series.map((s) => ["edited", s.time, s.exited, s.queued]),
  ];
  return rows
    .map((row) =>
      row
        .map((v) => `"${String(v ?? "not cleared").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
