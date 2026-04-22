import { useEffect, useRef, useState } from 'react';
import { Square } from 'lucide-react';
import type { Side, Team } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface Active {
  team: Side;
  teamInfo: Team;
  startedAt: number;
}

interface Props {
  active: Active | null;
  onStop: () => void;
  onExpired: () => void;
}

const TIMEOUT_SECONDS = 60;

function inFlashWindow(secs: number): boolean {
  return (secs >= 11 && secs <= 13) || (secs >= 1 && secs <= 3);
}

export function TimeoutTimer({ active, onStop, onExpired }: Props) {
  const [remaining, setRemaining] = useState(TIMEOUT_SECONDS);
  const [flashOn, setFlashOn] = useState(false);
  const rafRef = useRef<number | null>(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!active) {
      setRemaining(TIMEOUT_SECONDS);
      setFlashOn(false);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - active.startedAt) / 1000;
      const r = Math.max(0, TIMEOUT_SECONDS - elapsed);
      setRemaining(r);
      const rCeil = Math.ceil(r);
      const flashWindow = inFlashWindow(rCeil) && r > 0;
      setFlashOn(flashWindow && Math.floor(Date.now() / 180) % 2 === 0);
      if (r <= 0) {
        onExpiredRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-4 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-muted-fg/40" />
        <div className="text-sm text-muted-fg">No active timeout</div>
      </div>
    );
  }

  const secs = Math.ceil(remaining);
  const ss = String(secs).padStart(2, '0');
  const flashWindow = inFlashWindow(secs);

  return (
    <>
      <div
        className={cn(
          'rounded-3xl border-4 p-3 flex items-center justify-between gap-3',
          flashOn
            ? 'border-danger bg-danger text-white'
            : flashWindow
              ? 'border-danger bg-black text-danger'
              : 'border-danger bg-black text-danger'
        )}
      >
        <div className="min-w-0">
          <div
            className="text-[10px] uppercase tracking-widest opacity-80 px-2 py-0.5 rounded-md inline-block font-bold"
            style={{
              backgroundColor: active.teamInfo.jerseyColour,
              color: active.teamInfo.numberColour
            }}
          >
            Timeout · {active.teamInfo.name || `Team ${active.team}`}
          </div>
          <div className="font-mono font-black text-6xl tabular-nums leading-none mt-1">
            0:{ss}
          </div>
        </div>
        <Button variant="danger" size="lg" onClick={onStop}>
          <Square className="w-4 h-4" fill="currentColor" />
          Stop
        </Button>
      </div>
      {flashOn && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 bg-danger/40"
        />
      )}
    </>
  );
}
