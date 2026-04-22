import { useState } from 'react';
import type { FoulSubject, FoulType, Game, Side } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { GameClockInput, ZERO_CLOCK, isValidGameClock } from '@/components/GameClockInput';
import { FOUL_TYPE_LABEL } from '@/lib/events';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  side: Side;
  subject: FoulSubject;
  onClose: () => void;
  onCommit: (type: FoulType, gameClock: string) => void;
}

const PLAYER_TYPES: FoulType[] = [
  'personal',
  'technical',
  'unsportsmanlike',
  'disqualifying'
];

export function FoulModal({
  open,
  game,
  side,
  subject,
  onClose,
  onCommit
}: Props) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const player =
    subject.kind === 'player'
      ? team.players.find(p => p.id === subject.playerId)
      : null;

  const [clock, setClock] = useState(ZERO_CLOCK);

  if (!open) return null;
  if (subject.kind === 'player' && !player) return null;

  const valid = isValidGameClock(clock);

  const availableTypes: FoulType[] =
    subject.kind === 'player' ? PLAYER_TYPES : ['technical'];

  let chip: JSX.Element;
  let titleText: string;
  if (subject.kind === 'player' && player) {
    titleText = 'Foul';
    chip = (
      <span
        className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-lg font-mono font-bold"
        style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
      >
        #{player.number}
        {player.name && (
          <span className="ml-1 text-xs opacity-80 font-sans">
            {player.name}
          </span>
        )}
      </span>
    );
  } else {
    titleText = 'Technical foul';
    chip = (
      <span
        className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-lg text-xs font-bold tracking-widest uppercase"
        style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
      >
        {subject.kind === 'coach' ? 'Coach' : 'Bench'}
      </span>
    );
  }

  const title = (
    <span>
      {titleText} — {team.name || `Team ${side}`} {chip}
    </span>
  );

  const subtitle =
    subject.kind === 'player'
      ? `Quarter ${game.currentQuarter} — tap a foul type to log`
      : `Quarter ${game.currentQuarter} — does not count toward team fouls`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="lg"
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <GameClockInput value={clock} onChange={setClock} />
        <div
          className={cn(
            'grid gap-3',
            availableTypes.length === 1 ? 'grid-cols-1 w-[280px]' : 'grid-cols-1 w-[280px]'
          )}
        >
          {availableTypes.map(t => (
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
