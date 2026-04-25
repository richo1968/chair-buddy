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

/** Format the foul breakdown like "2P - 1T" or "3P". Empty string when no fouls. */
function foulBreakdown(stats: PlayerFoulStats): string {
  const parts: string[] = [];
  if (stats.personal > 0) parts.push(`${stats.personal}P`);
  if (stats.technical > 0) parts.push(`${stats.technical}T`);
  if (stats.unsportsmanlike > 0) parts.push(`${stats.unsportsmanlike}U`);
  if (stats.disqualifying > 0) parts.push(`${stats.disqualifying}DQ`);
  return parts.join(' - ');
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
  const hasFouls = stats.total > 0;

  // Top-right badge: total foul count, with DQ override since 1 DQ ejects.
  const badgeText =
    stats.ejectedReason === 'dq' ? 'DQ' : String(stats.total);
  const badgeClasses = stats.ejected
    ? 'bg-danger text-white'
    : 'bg-black/60 text-white';

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
      {hasFouls && (
        <span
          className={cn(
            'absolute top-1 right-1 min-w-[22px] h-[22px] px-1.5 rounded-full',
            'flex items-center justify-center',
            'text-[11px] font-bold leading-none font-mono ring-1 ring-black/30',
            badgeClasses
          )}
          aria-label={`${stats.total} fouls`}
        >
          {badgeText}
        </span>
      )}

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

      {hasFouls && (
        <div
          className="mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/30"
          style={{ color: numberColour }}
        >
          {foulBreakdown(stats)}
        </div>
      )}
    </button>
  );
}
