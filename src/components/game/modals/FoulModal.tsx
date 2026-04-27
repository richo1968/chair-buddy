import { useState } from 'react';
import { Timer } from 'lucide-react';
import type { FoulSubject, FoulType, FreeThrows, Game, Quarter, Side } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { GameClockInput, isValidGameClock } from '@/components/GameClockInput';
import { FOUL_TYPE_LABEL } from '@/lib/events';
import { timeoutStatus } from '@/lib/game';
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
  /** Start a 1-minute countdown for the given side. Used by the inline
   *  timeout buttons so the chair can fire off a timeout while still
   *  entering foul data. The TimeoutModal then opens after this foul is
   *  committed (or cancelled) so the timeout's own clock can be logged. */
  onStartTimeout: (team: Side) => void;
  /** When set, this foul is being logged retroactively into a past quarter.
   *  Affects the subtitle and the default clock (10:00 instead of lastGameClock). */
  quarter?: Quarter;
}

export function FoulModal({
  open,
  game,
  side,
  subject,
  onClose,
  onCommit,
  onStartTimeout,
  quarter
}: Props) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const player =
    subject.kind === 'player'
      ? team.players.find(p => p.id === subject.playerId)
      : null;

  const isPastEntry = quarter !== undefined && quarter !== game.currentQuarter;
  const displayQuarter = quarter ?? game.currentQuarter;

  const [clock, setClock] = useState(isPastEntry ? '10:00' : game.lastGameClock);

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

  const retroPrefix = isPastEntry ? `Past entry · Quarter ${displayQuarter}` : `Quarter ${displayQuarter}`;
  const subtitle =
    subject.kind === 'player'
      ? `${retroPrefix} — tap a foul type to log`
      : `${retroPrefix} — does not count toward team fouls`;

  const isPlayer = subject.kind === 'player';

  // Bench layout — left team's timeout button on the left, right team's on the right.
  const leftSide: Side = game.layout === 'A-left' ? 'A' : 'B';
  const rightSide: Side = leftSide === 'A' ? 'B' : 'A';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="lg"
    >
      <div className="space-y-4">
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

      {/* Timeout shortcuts — start a 1-minute countdown for either team
          without leaving this modal. The timeout's own clock entry happens
          after this foul is committed (or cancelled). Hidden when this is a
          retroactive past-quarter entry — there is no live timeout to start. */}
      {!isPastEntry && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <TimeoutQuickButton
            game={game}
            side={leftSide}
            onClick={() => onStartTimeout(leftSide)}
          />
          <TimeoutQuickButton
            game={game}
            side={rightSide}
            onClick={() => onStartTimeout(rightSide)}
          />
        </div>
      )}
      </div>
    </Modal>
  );
}

function TimeoutQuickButton({
  game,
  side,
  onClick
}: {
  game: Game;
  side: Side;
  onClick: () => void;
}) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const status = timeoutStatus(game, side);
  const noneLeft = status.remaining === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={noneLeft}
      className={cn(
        'rounded-2xl border-2 border-border p-3 flex items-center gap-3 text-left',
        'active:brightness-110 transition-none',
        'disabled:opacity-40 disabled:cursor-not-allowed'
      )}
      style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
      title={
        noneLeft
          ? `${team.name || `Team ${side}`} has no timeouts left this ${status.phaseLabel.toLowerCase()}`
          : `Start a 1-minute timeout for ${team.name || `Team ${side}`} (${status.remaining} of ${status.max} left)`
      }
    >
      <Timer className="w-6 h-6 shrink-0 opacity-90" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest opacity-75 leading-tight">
          Start timeout
        </div>
        <div className="text-sm font-bold truncate leading-tight">
          {team.name || `Team ${side}`}
        </div>
      </div>
      <div className="text-xs font-mono font-bold opacity-80 shrink-0 tabular-nums">
        {status.remaining}/{status.max}
      </div>
    </button>
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
