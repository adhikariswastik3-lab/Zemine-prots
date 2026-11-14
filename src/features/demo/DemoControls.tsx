import { useState } from "react";
import { Sheet } from "@/components/ui/Overlay";
import { scenarios, setScenario, setSpeed, useScenario, useSpeed, type ScenarioId } from "@/services/mock/scenario";

export default function DemoControls() {
  const [open, setOpen] = useState(false);
  const scenario = useScenario();
  const speed = useSpeed();
  return (
    <>
      <button type="button" className="demo-fab" onClick={() => setOpen(true)} aria-label="Open demo controls">DEMO</button>
      {open && (
        <Sheet title="Demo scenario" eyebrow="Prototype only" onClose={() => setOpen(false)}>
          <p className="small muted" style={{ marginBottom: 14 }}>Pick what happens next. Failure scenarios trigger once, then return to normal. Offline stays on until changed.</p>
          <div className="field">
            <label htmlFor="scenario">Next result</label>
            <select id="scenario" value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioId)}>
              {scenarios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="speed">Network speed</label>
            <select id="speed" value={speed} onChange={(e) => setSpeed(e.target.value as "fast" | "realistic")}>
              <option value="fast">Fast (default)</option>
              <option value="realistic">Realistic (2x slower)</option>
            </select>
          </div>
        </Sheet>
      )}
    </>
  );
}
