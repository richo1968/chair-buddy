import { cn } from '@/lib/utils';
import type { Player } from '@/types';
import type { PlayerFoulStats } from '@/lib/game';

interface Props {
  player: Player;
  stats: PlayerFoulStats;
  jerseyColour: string;
  numberColour: string;
  onClick: () => void;
}

export function PlayerTile({
  player,
  stats,
  jerseyColour,
  numberColour,
  onClick
}: Props) {
  const redBorder = stats.ejected || stats.fourFoulWarning;
  const orangeBorder = !redBorder && stats.tuWarning;

  let statusChip: string;
  let chipClass: string;
  if (stats.ejected) {
    statusChip = stats.ejectedReason === 'dq' ? 'DQ' : 'OUT';
    chipClass = 'bg-danger text-white';
  } else if (stats.tu > 0) {
    statusChip = `${stats.total}F·${stats.tu}T`;
    chipClass = 'bg-black/30';
  } else {
    statusChip = `${stats.total}F`;
    chipClass = 'bg-black/25';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative aspect-square rounded-2xl flex flex-col items-center justify-center',
        'active:brightness-110 transition-none select-none',
        redBorder
          ? 'border-4 border-danger'
          : orangeBorder
            ? 'border-4 border-warn'
            : 'border-2 border-border'
      )}
      style={{ backgroundColor: jerseyColour, color: numberColour }}
    >
      <div className="font-mono font-black text-3xl leading-none">
        {player.number}
      </div>
      {player.name && (
        <div
          className="text-[10px] font-semibold uppercase truncate max-w-[90%] opacity-80 mt-1"
          style={{ color: numberColour }}
        >
          {player.name}
        </div>
      )}
      <div
        className={cn(
          'mt-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono',
          chipClass
        )}
        style={
          !stats.ejected && stats.tu === 0
            ? { color: numberColour }
            : undefined
        }
      >
        {statusChip}
      </div>
    </button>
  );
}
