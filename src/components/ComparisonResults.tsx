import { Download, ArrowUpRight, ArrowDownRight, Equal } from "lucide-react";
import type { Comparison, Sample } from "../simulation/types";
import { download, comparisonCSV } from "../io";
export const seconds = (n: number | null) =>
  n === null ? "Not cleared" : `${n.toFixed(1)} s`;
export function ComparisonResults({ result }: { result: Comparison }) {
  const { before, after } = result;
  const a = before.metrics,
    b = after.metrics;
  const delta =
    a.clearance !== null && b.clearance !== null
      ? a.clearance - b.clearance
      : null;
  const maxTime = Math.max(a.elapsed, b.elapsed);
  const line = (samples: Sample[]) =>
    samples
      .map(
        (s, i) =>
          `${i ? "L" : "M"}${48 + (s.time / maxTime) * 690},${170 - (s.exited / result.crowd) * 145}`,
      )
      .join(" ");
  return (
    <section className="comparison-results" aria-labelledby="results-heading">
      <div className="results-heading">
        <div>
          <h2 id="results-heading">The same crowd. Two layouts.</h2>
          <p>Same {result.crowd} people. Same starting points. Two layouts.</p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            download(
              "crowdflow-comparison.csv",
              comparisonCSV(result),
              "text/csv",
            )
          }
        >
          <Download size={16} /> Export results
        </button>
      </div>
      <div className="results-body">
        <div className="result-summary">
          <span
            className={`result-delta ${delta !== null && delta < 0 ? "worse" : ""}`}
          >
            {delta === null ? (
              <Equal size={25} />
            ) : delta >= 0 ? (
              <ArrowDownRight size={28} />
            ) : (
              <ArrowUpRight size={28} />
            )}
            {delta === null
              ? "Compare totals"
              : delta === 0
                ? "Same clearance time"
                : `${Math.abs(delta).toFixed(1)} s ${delta > 0 ? "faster" : "slower"}`}
          </span>
          <p>
            {delta === null
              ? "At least one layout still has people inside after the 180 s limit."
              : delta === 0
                ? "Both layouts cleared in the same simulated time."
                : `Your layout ${delta > 0 ? "reduced" : "increased"} the time for everyone to reach an exit by ${Math.abs((delta / a.clearance!) * 100).toFixed(0)}%.`}
          </p>
          <table>
            <caption className="sr-only">Computed layout comparison</caption>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col">Original</th>
                <th scope="col">Your layout</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">All people out</th>
                <td>{seconds(a.clearance)}</td>
                <td>{seconds(b.clearance)}</td>
              </tr>
              <tr>
                <th scope="row">Average exit time¹</th>
                <td>
                  {a.meanExitTime === null ? "—" : seconds(a.meanExitTime)}
                </td>
                <td>
                  {b.meanExitTime === null ? "—" : seconds(b.meanExitTime)}
                </td>
              </tr>
              <tr>
                <th scope="row">Peak waiting²</th>
                <td>{a.peakQueue}</td>
                <td>{b.peakQueue}</td>
              </tr>
              <tr>
                <th scope="row">Still inside</th>
                <td>{a.remaining}</td>
                <td>{b.remaining}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="result-chart">
          <div className="chart-label">
            <strong>People through the exits</strong>
            <span>
              <i className="line-key original" /> Original{" "}
              <i className="line-key edited" /> Your layout
            </span>
          </div>
          <svg
            viewBox="0 0 770 210"
            role="img"
            aria-label={`Cumulative people exited over time. Original: ${a.exited} in ${a.elapsed.toFixed(1)} seconds. Your layout: ${b.exited} in ${b.elapsed.toFixed(1)} seconds.`}
          >
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <line
                  x1="48"
                  x2="738"
                  y1={170 - t * 145}
                  y2={170 - t * 145}
                  stroke="#daddd4"
                  strokeDasharray="3 5"
                />
                <text x="36" y={175 - t * 145} textAnchor="end">
                  {Math.round(t * result.crowd)}
                </text>
              </g>
            ))}
            <path
              d={line(before.series)}
              stroke="#899598"
              strokeWidth="3"
              fill="none"
            />
            <path
              d={line(after.series)}
              stroke="#245bea"
              strokeWidth="3"
              fill="none"
            />
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <text key={t} x={48 + t * 690} y="198" textAnchor="middle">
                {(maxTime * t).toFixed(0)} s
              </text>
            ))}
          </svg>
          <p>
            ¹ People who exited only. ² People stationary for at least 1 second.
            Educational model; results depend on its assumptions.
          </p>
        </div>
      </div>
    </section>
  );
}
