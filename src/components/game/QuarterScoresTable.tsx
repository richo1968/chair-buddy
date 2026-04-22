import { Pencil } from 'lucide-react';
import type { Game, Quarter } from '@/types';
import { quarterOrder, totalScore } from '@/lib/game';
import { cn } from '@/lib/utils';

interface Props {
  game: Game;
  onEditQuarter: (quarter: Quarter) => void;
}

export function QuarterScoresTable({ game, onEditQuarter }: Props) {
  const rows = [...game.quarterScores].sort(
    (a, b) => quarterOrder(a.quarter) - quarterOrder(b.quarter)
  );
  const totA = totalScore(game, 'A');
  const totB = totalScore(game, 'B');

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-xs text-muted-fg uppercase tracking-wider border-b border-border">
        <div>Qtr</div>
        <div
          className="text-right font-semibold"
          style={{ color: game.teamA.jerseyColour }}
        >
          {game.teamA.name || 'A'}
        </div>
        <div
          className="text-right font-semibold"
          style={{ color: game.teamB.jerseyColour }}
        >
          {game.teamB.name || 'B'}
        </div>
        <div className="w-8" />
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-fg italic">
          No quarter scores recorded yet.
        </div>
      ) : (
        rows.map(qs => (
          <div
            key={qs.quarter}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-1.5 items-center border-b border-border/60 last:border-b-0"
          >
            <div className="font-semibold">{qs.quarter}</div>
            <div className="text-right font-mono tabular-nums">
              {qs.teamAScore}
            </div>
            <div className="text-right font-mono tabular-nums">
              {qs.teamBScore}
            </div>
            <button
              type="button"
              onClick={() => onEditQuarter(qs.quarter)}
              aria-label={`Edit ${qs.quarter}`}
              className="h-8 w-8 rounded-lg border border-border bg-muted flex items-center justify-center active:brightness-125 transition-none"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}
      <div
        className={cn(
          'grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 items-center',
          'border-t border-border bg-surface-hi font-bold'
        )}
      >
        <div>Total</div>
        <div className="text-right font-mono tabular-nums text-lg">{totA}</div>
        <div className="text-right font-mono tabular-nums text-lg">{totB}</div>
        <div className="w-8" />
      </div>
    </div>
  );
}
