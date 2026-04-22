import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  Flag,
  type LucideIcon
} from 'lucide-react';
import type { Game, GameEvent } from '@/types';
import { describeEvent, eventSideTint } from '@/lib/events';
import { sortEvents } from '@/lib/game';
import { cn } from '@/lib/utils';

interface Props {
  game: Game;
  onEventTap: (event: GameEvent) => void;
}

function eventIcon(ev: GameEvent): {
  Icon: LucideIcon;
  classes: string;
} {
  switch (ev.kind) {
    case 'foul':
      return {
        Icon: Flag,
        classes: 'text-danger bg-danger/10'
      };
    case 'warning':
      return {
        Icon: AlertTriangle,
        classes: 'text-warn bg-warn/15'
      };
    case 'possessionChange':
      return {
        Icon: ArrowLeftRight,
        classes: 'text-danger bg-black'
      };
    case 'quarterScoreRecorded':
      return {
        Icon: ClipboardList,
        classes: 'text-accent bg-accent/10'
      };
  }
}

export function EventLog({ game, onEventTap }: Props) {
  const events = sortEvents(game.events);

  return (
    <div className="rounded-2xl border border-border bg-surface flex flex-col min-h-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-fg uppercase tracking-wider flex items-center justify-between">
        <span>Event log</span>
        <span className="font-mono">{events.length}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {events.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-fg italic">
            No events logged yet.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {events.map(ev => {
              const tint = eventSideTint(ev, game);
              const { Icon, classes } = eventIcon(ev);
              const isWarning = ev.kind === 'warning';
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => onEventTap(ev)}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2.5',
                      'active:bg-surface-hi transition-none',
                      isWarning && 'bg-warn/5'
                    )}
                  >
                    <span
                      aria-hidden
                      className="w-1.5 h-9 rounded-full shrink-0"
                      style={{ backgroundColor: tint ?? 'transparent' }}
                    />
                    <span
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        classes
                      )}
                    >
                      <Icon className="w-4 h-4" strokeWidth={2.25} />
                    </span>
                    <span className="text-xs font-mono text-muted-fg w-[64px] tabular-nums shrink-0">
                      {ev.quarter} · {ev.gameClock}
                    </span>
                    <span className="text-sm flex-1 truncate">
                      {describeEvent(ev, game)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
