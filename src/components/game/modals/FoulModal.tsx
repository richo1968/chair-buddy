import { useState } from 'react';
import type { FoulType, Game, Side } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { GameClockInput, isValidGameClock } from '@/components/GameClockInput';
import { FOUL_TYPE_LABEL } from '@/lib/events';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  side: Side;
  playerId: string;
  onClose: () => void;
  onCommit: (type: FoulType, gameClock: string) => void;
}

const FOUL_TYPES: FoulType[] = [
  'personal',
  'technical',
  'unsportsmanlike',
  'disqualifying'
];

export function FoulModal({
  open,
  game,
  side,
  playerId,
  onClose,
  onCommit
}: Props) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const player = team.players.find(p => p.id === playerId);
  const [clock, setClock] = useState(game.lastGameClock);

  if (!open || !player) return null;

  const valid = isValidGameClock(clock);
  const title = (
    <span>
      Foul — {team.name || `Team ${side}`}{' '}
      <span
        className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-lg font-mono font-bold"
        style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
      >
        #{player.number}
      </span>
      {player.name && <span className="ml-2 text-muted-fg">{player.name}</span>}
    </span>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={`Quarter ${game.currentQuarter} · tap a foul type to log`}
      size="lg"
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <GameClockInput value={clock} onChange={setClock} />
        <div className="grid grid-cols-1 gap-3 w-[280px]">
          {FOUL_TYPES.map(t => (
            <button
              key={t}
              type="button"
              disabled={!valid}
              onClick={() => onCommit(t, clock)}
              className={cn(
                'rounded-2xl border-2 px-4 py-5 text-lg font-bold',
                'bg-surface-hi border-border text-fg',
                'active:brightness-125 transition-none',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {FOUL_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
