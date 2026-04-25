import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
  const [ftOpen, setFtOpen] = useState(false);
  const [ftAttempted, setFtAttempted] = useState('');
  const [ftMade, setFtMade] = useState('');

  if (!open) return null;
  if (subject.kind === 'player' && !player) return null;

  const clockValid = isValidGameClock(clock);
  const ftAtt = parseInt(ftAttempted, 10);
  const ftMd = parseInt(ftMade, 10);
  const ftHasInput = ftAttempted.length > 0 || ftMade.length > 0;
  const ftValid =
    !ftHasInput ||
    (Number.isFinite(ftAtt) &&
      Number.isFinite(ftMd) &&
      ftAtt >= 0 &&
      ftMd >= 0 &&
      ftMd <= ftAtt);

  const valid = clockValid && ftValid;

  const computeFreeThrows = (): FreeThrows | undefined => {
    if (!ftHasInput) return undefined;
    if (!Number.isFinite(ftAtt) || !Number.isFinite(ftMd)) return undefined;
    return { attempted: ftAtt, made: ftMd };
  };

  const commit = (type: FoulType, ftOverride?: FreeThrows) => {
    if (!valid) return;
    onCommit(type, clock, ftOverride ?? computeFreeThrows());
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
                disabled={!valid}
                label={FOUL_TYPE_LABEL.personal}
                onClick={() => commit('personal')}
              />
              <div className="grid grid-cols-3 gap-2 -mt-1">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    type="button"
                    disabled={!valid}
                    onClick={() =>
                      commit('personal', { attempted: n, made: 0 })
                    }
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
                disabled={!valid}
                label={FOUL_TYPE_LABEL.technical}
                onClick={() => commit('technical')}
              />
              <FoulTypeButton
                disabled={!valid}
                label={FOUL_TYPE_LABEL.unsportsmanlike}
                onClick={() => commit('unsportsmanlike')}
              />
              <FoulTypeButton
                disabled={!valid}
                label={FOUL_TYPE_LABEL.disqualifying}
                onClick={() => commit('disqualifying')}
              />
            </>
          ) : (
            <FoulTypeButton
              disabled={!valid}
              label={FOUL_TYPE_LABEL.technical}
              onClick={() => commit('technical')}
            />
          )}

          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setFtOpen(o => !o)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold active:brightness-110 transition-none"
            >
              <span className="text-muted-fg">
                Free throws (manual)
                {ftHasInput && ftValid && (
                  <span className="ml-2 text-fg">
                    {ftMd}/{ftAtt}
                  </span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  ftOpen && 'rotate-180'
                )}
              />
            </button>
            {ftOpen && (
              <div className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-[10px] text-muted-fg uppercase tracking-widest mb-0.5">
                      Attempted
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ftAttempted}
                      onChange={e =>
                        setFtAttempted(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="0"
                      className="h-10 w-full rounded-lg bg-surface-hi border border-border px-2 text-center font-mono text-base"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] text-muted-fg uppercase tracking-widest mb-0.5">
                      Made
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ftMade}
                      onChange={e =>
                        setFtMade(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="0"
                      className="h-10 w-full rounded-lg bg-surface-hi border border-border px-2 text-center font-mono text-base"
                    />
                  </label>
                </div>
                {ftHasInput && !ftValid && (
                  <div className="text-[11px] text-danger">
                    Made must be ≤ attempted, both ≥ 0.
                  </div>
                )}
                <div className="text-[10px] text-muted-fg leading-relaxed">
                  Use this when the FT count isn't covered by P1/P2/P3 — e.g.
                  technical, unsportsmanlike, or recording made shots after the
                  fact. Edit later via the event log too.
                </div>
              </div>
            )}
          </div>
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
