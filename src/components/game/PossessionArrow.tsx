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
  const pointsLeft =
    arrow !== null && ((arrow === 'A') === leftIsA);

  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'w-full rounded-3xl border-2 border-danger bg-black text-danger',
        'flex items-center justify-center gap-4 py-4',
        'active:brightness-110 transition-none'
      )}
      aria-label="Possession arrow"
    >
      {arrow === null ? (
        <>
          <Minus className="w-10 h-10 opacity-70" />
          <span className="text-base font-semibold tracking-wide">
            Tap to set possession
          </span>
        </>
      ) : pointsLeft ? (
        <ArrowLeft className="w-20 h-20" strokeWidth={3.25} />
      ) : (
        <ArrowRight className="w-20 h-20" strokeWidth={3.25} />
      )}
    </button>
  );
}
