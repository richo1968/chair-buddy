import { ArrowLeft, ArrowRight, Minus } from 'lucide-react';
import type { Game } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  game: Game;
  onTap: () => void;
}

export function PossessionArrow({ game, onTap }: Props) {
  const arrow = game.possessionArrow;
  const leftIsA = game.layout === 'A-left';

  const teamForArrow =
    arrow === 'A' ? game.teamA : arrow === 'B' ? game.teamB : null;
  const pointsLeft =
    arrow !== null && ((arrow === 'A') === leftIsA);

  const bg = teamForArrow?.jerseyColour ?? 'transparent';
  const fg = teamForArrow?.numberColour ?? 'hsl(var(--fg))';

  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'w-full rounded-3xl border-2 border-border flex items-center justify-center gap-4',
        'py-3 active:brightness-110 transition-none'
      )}
      style={{ backgroundColor: bg, color: fg }}
      aria-label="Change possession"
    >
      {arrow === null ? (
        <>
          <Minus className="w-10 h-10 opacity-60" />
          <span className="text-base font-semibold opacity-80">
            Tap to set possession
          </span>
        </>
      ) : pointsLeft ? (
        <ArrowLeft className="w-16 h-16" strokeWidth={3} />
      ) : (
        <ArrowRight className="w-16 h-16" strokeWidth={3} />
      )}
    </button>
  );
}
