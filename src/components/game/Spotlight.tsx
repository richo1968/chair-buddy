import { useEffect } from 'react';
import { Mic } from 'lucide-react';

export interface SpotlightItem {
  /** Jersey number, or a short label like "T/O". */
  badge: string;
  jerseyColour: string;
  numberColour: string;
  title: string;
  detail?: string;
}

export interface SpotlightData {
  key: number;
  items: SpotlightItem[];
  voice?: boolean;
}

const HOLD_MS = 2200;

/**
 * Brief, self-dismissing confirmation of what was just logged: the player's
 * tile grows to the middle of the screen with their new foul/points count,
 * then fades. Tap to dismiss early. It never blocks the screen underneath.
 */
export function Spotlight({ data, onDone }: { data: SpotlightData | null; onDone: () => void }) {
  useEffect(() => {
    if (!data) return;
    const t = window.setTimeout(onDone, HOLD_MS + data.items.length * 400);
    return () => window.clearTimeout(t);
  }, [data, onDone]);

  if (!data) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
      <div
        key={data.key}
        className="animate-spotlight pointer-events-auto flex gap-4"
        style={{ ['--spotlight-ms' as string]: `${HOLD_MS + data.items.length * 400}ms` }}
        onClick={onDone}
      >
        {data.items.map((it, i) => (
          <div
            key={i}
            className="w-[260px] rounded-[2rem] border-4 border-white/80 shadow-2xl px-5 py-6 flex flex-col items-center text-center"
            style={{ backgroundColor: it.jerseyColour, color: it.numberColour }}
          >
            {data.voice && (
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest opacity-80 mb-1">
                <Mic className="w-3 h-3" /> Voice
              </div>
            )}
            <div className="font-mono font-black text-7xl leading-none">{it.badge}</div>
            <div className="mt-3 text-xl font-bold leading-tight">{it.title}</div>
            {it.detail && <div className="mt-1 text-sm font-semibold opacity-85">{it.detail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
