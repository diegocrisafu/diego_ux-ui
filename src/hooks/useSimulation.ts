import { useEffect, useMemo, useState } from "react";
import { participantsFor, Simulation } from "../simulation/engine";
import { DT, type Layout } from "../simulation/types";
export function useSimulation(
  layout: Layout,
  crowd: number,
  seed: number,
  reset: number,
  playing: boolean,
  speed: number,
) {
  const simulation = useMemo(() => {
    void reset;
    return new Simulation(layout, participantsFor([layout], crowd, seed));
  }, [layout, crowd, seed, reset]);
  const [snapshot, setSnapshot] = useState({
    simulation,
    metrics: simulation.metrics(),
  });
  useEffect(() => {
    let frame = 0,
      last = 0,
      accumulator = 0,
      lastUpdate = 0;
    const loop = (now: number) => {
      if (last && playing && !document.hidden && !simulation.done) {
        accumulator += Math.min((now - last) / 1000, 0.1) * speed;
        while (accumulator >= DT && !simulation.done) {
          simulation.step();
          accumulator -= DT;
        }
      }
      last = now;
      if (now - lastUpdate > 100) {
        setSnapshot({ simulation, metrics: simulation.metrics() });
        lastUpdate = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [simulation, playing, speed]);
  return {
    simulation,
    metrics:
      snapshot.simulation === simulation
        ? snapshot.metrics
        : simulation.metrics(),
  };
}
