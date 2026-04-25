import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  Flag,
  Timer,
  type LucideIcon
} from 'lucide-react';
import type { Game, GameEvent, Side } from '@/types';
import { describeEvent } from '@/lib/events';
import { eventBelongsToTeam, sortEventsNewestFirst } from '@/lib/game';
import { cn } from '@/lib/utils';

interface Props {
  game: Game;
  side: Side;
  onEventTap: (event: GameEvent) => void;
  className?: string;
}

function iconFor(ev: GameEvent): { Icon: LucideIcon; classes: string } {
  switch (ev.kind) {
    case 'foul':
      return { Icon: Flag, classes: 'text-danger' };
    case 'warning':
      return { Icon: AlertTriangle, classes: 'text-warn' };
    case 'possessionChange':
      return { Icon: ArrowLeftRight, classes: 'text-danger' };
    case 'quarterScoreRecorded':
      return { Icon: ClipboardList, classes: 'text-accent' };
    case 'timeout':
      return { Icon: Timer, classes: 'text-fg' };
    case 'protest':
      return { Icon: AlertOctagon, classes: 'text-danger' };
  }
}

export function TeamEventLog({ game, side, onEventTap, className }: Props) {
  const events = sortEventsNewestFirst(
    game.events.filter(e => eventBelongsToTeam(e, side))
  );

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface flex flex-col min-h-0 overflow-hidden',
        className
      )}
    >
      <div className="shrink-0 px-3 py-1.5 border-b border-border text-[10px] text-muted-fg uppercase tracking-wider flex items-center justify-between">
        <span>Log</span>
        <span className="font-mono">{events.length}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-3 py-3 text-xs text-muted-fg italic">
            No events yet.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {events.map(ev => {
              const { Icon, classes } = iconFor(ev);
              const isWarning = ev.kind === 'warning';
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => onEventTap(ev)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 flex items-center gap-2',
                      'active:bg-surface-hi transition-none',
                      isWarning && 'bg-warn/5'
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                        classes
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </span>
                    <span className="text-[10px] font-mono text-muted-fg w-[52px] tabular-nums shrink-0">
                      {ev.quarter} · {ev.gameClock}
                    </span>
                    <span className="text-xs flex-1 truncate">
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
