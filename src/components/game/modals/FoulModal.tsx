import { useState } from 'react';
import type { FoulSubject, FoulType, FreeThrows, Game, Side } from '@/types';
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
  onCommit: (
    type: FoulType,
    gameClock: string,
    freeThrows: FreeThrows | undefined
  ) => void;
}

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

  const clockValid = isValidGameClock(clock);

  const commit = (type: FoulType, awarded?: number) => {
    if (!clockValid) return;
    onCommit(type, clock, awarded !== undefined ? { awarded } : undefined);
  };

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

  const isPlayer = subject.kind === 'player';

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
        <div className="grid gap-3 grid-cols-1 w-[300px]">
          {isPlayer ? (
            <>
              <FoulTypeButton
                disabled={!clockValid}
                label={FOUL_TYPE_LABEL.personal}
                onClick={() => commit('personal')}
              />
              <div className="grid grid-cols-3 gap-2 -mt-1">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    type="button"
                    disabled={!clockValid}
                    onClick={() => commit('personal', n)}
                    className={cn(
                      'rounded-xl border-2 py-2 text-base font-bold font-mono tabular-nums',
                      'bg-surface border-border text-fg',
                      'active:brightness-125 transition-none',
                      'disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                    title={`Personal foul + ${n} free throw${n === 1 ? '' : 's'} awarded`}
                  >
                    P{n}
                  </button>
                ))}
              </div>
              <FoulTypeButton
                disabled={!clockValid}
                label={FOUL_TYPE_LABEL.technical}
                onClick={() => commit('technical')}
              />
              <FoulTypeButton
                disabled={!clockValid}
                label={FOUL_TYPE_LABEL.unsportsmanlike}
                onClick={() => commit('unsportsmanlike')}
              />
              <FoulTypeButton
                disabled={!clockValid}
                label={FOUL_TYPE_LABEL.disqualifying}
                onClick={() => commit('disqualifying')}
              />
            </>
          ) : (
            <FoulTypeButton
              disabled={!clockValid}
              label={FOUL_TYPE_LABEL.technical}
              onClick={() => commit('technical')}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

function FoulTypeButton({
  label,
  disabled,
  onClick
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-2xl border-2 px-4 py-4 text-lg font-bold',
        'bg-surface-hi border-border text-fg',
        'active:brightness-125 transition-none',
        'disabled:opacity-40 disabled:cursor-not-allowed'
      )}
    >
      {label}
    </button>
  );
}
