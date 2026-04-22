import { cn } from '@/lib/utils';
import type { Player } from '@/types';

interface Props {
  player: Player;
  fouls: number;
  jerseyColour: string;
  numberColour: string;
  onClick: () => void;
}

export function PlayerTile({
  player,
  fouls,
  jerseyColour,
  numberColour,
  onClick
}: Props) {
  const foulOut = fouls >= 5;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative aspect-square rounded-2xl flex flex-col items-center justify-center',
        'border-2 active:brightness-110 transition-none select-none',
        foulOut ? 'border-danger' : 'border-border'
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
          'mt-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold',
          foulOut ? 'bg-danger text-white' : 'bg-black/25'
        )}
        style={!foulOut ? { color: numberColour } : undefined}
      >
        {foulOut ? 'FOULED OUT' : `${fouls} F`}
      </div>
    </button>
  );
}
