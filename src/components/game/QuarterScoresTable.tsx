import { Pencil } from 'lucide-react';
import type { Game, Quarter } from '@/types';
import { quarterOrder, totalScore } from '@/lib/game';
import { cn } from '@/lib/utils';

interface Props {
  game: Game;
  onEditQuarter: (quarter: Quarter) => void;
}

// Fixed column widths so team-name badges and score digits align across rows.
const COLS = 'grid grid-cols-[56px_1fr_1fr_36px] gap-2 items-center';

export function QuarterScoresTable({ game, onEditQuarter }: Props) {
  const rows = [...game.quarterScores].sort(
    (a, b) => quarterOrder(a.quarter) - quarterOrder(b.quarter)
  );
  const totA = totalScore(game, 'A');
  const totB = totalScore(game, 'B');

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className={cn(COLS, 'px-3 py-2 border-b border-border')}>
        <div className="text-[10px] text-muted-fg uppercase tracking-wider">
          Qtr
        </div>
        <div className="flex justify-center min-w-0">
          <TeamBadge
            name={game.teamA.name || 'Team A'}
            jerseyColour={game.teamA.jerseyColour}
            numberColour={game.teamA.numberColour}
          />
        </div>
        <div className="flex justify-center min-w-0">
          <TeamBadge
            name={game.teamB.name || 'Team B'}
            jerseyColour={game.teamB.jerseyColour}
            numberColour={game.teamB.numberColour}
          />
        </div>
        <div />
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-fg italic">
          No quarter scores recorded yet.
        </div>
      ) : (
        rows.map(qs => (
          <div
            key={qs.quarter}
            className={cn(
              COLS,
              'px-3 py-1.5 border-b border-border/60 last:border-b-0'
            )}
          >
            <div className="font-semibold">{qs.quarter}</div>
            <div className="text-center font-mono tabular-nums">
              {qs.teamAScore}
            </div>
            <div className="text-center font-mono tabular-nums">
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
          COLS,
          'px-3 py-2 border-t border-border bg-surface-hi font-bold'
        )}
      >
        <div>Total</div>
        <div className="text-center font-mono tabular-nums text-lg">
          {totA}
        </div>
        <div className="text-center font-mono tabular-nums text-lg">
          {totB}
        </div>
        <div />
      </div>
    </div>
  );
}

function TeamBadge({
  name,
  jerseyColour,
  numberColour
}: {
  name: string;
  jerseyColour: string;
  numberColour: string;
}) {
  return (
    <span
      className="inline-block max-w-full truncate px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: jerseyColour, color: numberColour }}
      title={name}
    >
      {name}
    </span>
  );
}
