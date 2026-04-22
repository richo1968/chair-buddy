import type { Game, WarningTarget, WarningType } from '@/types';
import { cn } from '@/lib/utils';
import { warningTargetSide } from '@/lib/events';

interface Props {
  game: Game;
  onTap: (target: WarningTarget, type: WarningType) => void;
}

const BUTTONS: Array<{
  target: WarningTarget;
  type: WarningType;
  label: string;
}> = [
  { target: 'teamA', type: 'general', label: 'Team · Warning' },
  { target: 'teamA', type: 'time-delay', label: 'Team · Time-delay' },
  { target: 'benchA', type: 'general', label: 'Bench · Warning' },
  { target: 'benchA', type: 'time-delay', label: 'Bench · Time-delay' },
  { target: 'teamB', type: 'general', label: 'Team · Warning' },
  { target: 'teamB', type: 'time-delay', label: 'Team · Time-delay' },
  { target: 'benchB', type: 'general', label: 'Bench · Warning' },
  { target: 'benchB', type: 'time-delay', label: 'Bench · Time-delay' }
];

export function WarningsGrid({ game, onTap }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-fg uppercase tracking-wider">
        Warnings
      </div>
      <div className="grid grid-cols-2">
        {BUTTONS.map(b => {
          const side = warningTargetSide(b.target);
          const colour =
            side === 'A' ? game.teamA.jerseyColour : game.teamB.jerseyColour;
          const text =
            side === 'A' ? game.teamA.numberColour : game.teamB.numberColour;
          return (
            <button
              key={`${b.target}-${b.type}`}
              type="button"
              onClick={() => onTap(b.target, b.type)}
              className={cn(
                'border-r border-b border-border/60 last:border-r-0',
                'px-3 py-2 text-left active:brightness-110 transition-none',
                'flex flex-col gap-0.5'
              )}
              style={{ backgroundColor: colour, color: text }}
            >
              <span className="text-[10px] uppercase font-semibold opacity-80">
                {side === 'A'
                  ? game.teamA.name || 'Team A'
                  : game.teamB.name || 'Team B'}
              </span>
              <span className="text-sm font-bold leading-tight">{b.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
