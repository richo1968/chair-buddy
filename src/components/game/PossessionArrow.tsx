import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Minus } from 'lucide-react';
import type { Game } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  game: Game;
  onTap: () => void;
}

export function PossessionArrow({ game, onTap }: Props) {
  const direction = game.arrowDirection;
  const prevDirection = useRef(direction);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (prevDirection.current !== null && direction !== prevDirection.current) {
      setFlashKey(k => k + 1);
    }
    prevDirection.current = direction;
  }, [direction]);

  return (
    <button
      type="button"
      onClick={onTap}
      key={flashKey}
      className={cn(
        'w-full rounded-3xl border-2 border-danger bg-black text-danger',
        'flex items-center justify-center gap-4 py-4',
        'active:brightness-110 transition-none',
        flashKey > 0 && 'arrow-flash'
      )}
      aria-label="Possession arrow"
    >
      {direction === null ? (
        <>
          <Minus className="w-10 h-10 opacity-70" />
          <span className="text-base font-semibold tracking-wide">
            Tap to set possession
          </span>
        </>
      ) : direction === 'left' ? (
        <ArrowLeft className="w-20 h-20" strokeWidth={3.25} />
      ) : (
        <ArrowRight className="w-20 h-20" strokeWidth={3.25} />
      )}
    </button>
  );
}
