import { useState } from 'react';
import { GameClockInput, DEFAULT_CLOCK, isValidGameClock } from '@/components/GameClockInput';

export default function App() {
  const [clock, setClock] = useState(DEFAULT_CLOCK);
  const [log, setLog] = useState<string[]>([]);
  const [lastClock, setLastClock] = useState(DEFAULT_CLOCK);
  const valid = isValidGameClock(clock);

  const commit = () => {
    if (!valid) return;
    setLog(l => [`${new Date().toLocaleTimeString()}  committed ${clock}`, ...l].slice(0, 20));
    setLastClock(clock);
  };

  return (
    <div className="min-h-full w-full bg-bg text-fg p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">GameClockInput — test harness</h1>
          <div className="text-sm text-muted-fg">Milestone 2</div>
        </header>

        <div className="grid grid-cols-[420px_1fr] gap-6">
          <section className="rounded-3xl bg-surface border border-border p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-fg">Current value</div>
              <div className="font-mono text-fg tabular-nums">{clock}</div>
            </div>
            <GameClockInput value={clock} onChange={setClock} />
            <button
              type="button"
              onClick={commit}
              disabled={!valid}
              className="mt-4 w-full tap-target rounded-2xl bg-accent text-bg font-bold text-lg active:brightness-110 transition-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Commit
            </button>
          </section>

          <section className="rounded-3xl bg-surface border border-border p-5 flex flex-col gap-4">
            <div>
              <div className="text-sm text-muted-fg mb-1">Validity</div>
              <div className={valid ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                {valid ? 'valid' : 'invalid — seconds must be 0–59, minutes 0–12'}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-fg mb-1">Last committed (simulating lastGameClock)</div>
              <div className="font-mono text-xl tabular-nums">{lastClock}</div>
              <button
                type="button"
                onClick={() => setClock(lastClock)}
                className="mt-2 tap-target rounded-xl border border-border px-4 text-sm active:brightness-110 transition-none"
              >
                Pre-fill from lastGameClock
              </button>
            </div>

            <div>
              <div className="text-sm text-muted-fg mb-2">Test cases</div>
              <div className="flex flex-wrap gap-2">
                {['10:00', '00:00', '07:23', '05:00', '00:05', '12:00'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setClock(v)}
                    className="tap-target rounded-xl border border-border px-4 font-mono active:brightness-110 transition-none"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-[200px]">
              <div className="text-sm text-muted-fg mb-2">Commit log</div>
              <div className="rounded-xl bg-muted border border-border p-3 h-full overflow-auto font-mono text-sm">
                {log.length === 0 ? (
                  <div className="text-muted-fg italic">nothing committed yet</div>
                ) : (
                  log.map((line, i) => <div key={i}>{line}</div>)
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-6 text-xs text-muted-fg leading-relaxed max-w-3xl">
          <div className="font-semibold text-fg mb-1">Try:</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Tap digits 7, 2, 3 → display should read 07:23</li>
            <li>Tap digits making seconds 60+ → display turns red, Commit disabled</li>
            <li>Tap ⌫ repeatedly → digits shift right, leading zeros fill in</li>
            <li>Tap the eraser → clears to 00:00</li>
            <li>Tap "Reset to 10:00" → sets to quarter-start</li>
            <li>Use "Pre-fill from lastGameClock" to simulate modal-open behaviour</li>
          </ul>
        </footer>
      </div>
    </div>
  );
}
