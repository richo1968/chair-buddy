import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { FoulSubject, Game, Quarter, Side, WarningType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { previousQuarters, sortPlayers } from '@/lib/game';
import { WARNING_TYPE_LABEL, WARNING_TYPES } from '@/lib/events';
import { cn } from '@/lib/utils';

export type PastEntryResult =
  | { kind: 'foul'; quarter: Quarter; side: Side; subject: FoulSubject }
  | { kind: 'warning'; quarter: Quarter; warningType: WarningType }
  | { kind: 'timeout'; quarter: Quarter; side: Side }
  | { kind: 'protest'; quarter: Quarter };

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onPick: (result: PastEntryResult) => void;
}

type Step =
  | { kind: 'pick-quarter' }
  | { kind: 'pick-event'; quarter: Quarter }
  | { kind: 'foul-pick-team'; quarter: Quarter; foulOn: 'player' | 'coach' | 'bench' }
  | { kind: 'foul-pick-player'; quarter: Quarter; side: Side }
  | { kind: 'warning-pick-type'; quarter: Quarter }
  | { kind: 'timeout-pick-team'; quarter: Quarter };

export function PastQuarterModal({ open, game, onClose, onPick }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'pick-quarter' });

  if (!open) return null;

  const previous = previousQuarters(game.currentQuarter);

  const reset = () => setStep({ kind: 'pick-quarter' });
  const close = () => {
    reset();
    onClose();
  };

  const back = () => {
    if (step.kind === 'pick-quarter') return;
    if (step.kind === 'pick-event') setStep({ kind: 'pick-quarter' });
    else if (step.kind === 'foul-pick-team')
      setStep({ kind: 'pick-event', quarter: step.quarter });
    else if (step.kind === 'foul-pick-player')
      setStep({ kind: 'foul-pick-team', quarter: step.quarter, foulOn: 'player' });
    else if (step.kind === 'warning-pick-type')
      setStep({ kind: 'pick-event', quarter: step.quarter });
    else if (step.kind === 'timeout-pick-team')
      setStep({ kind: 'pick-event', quarter: step.quarter });
  };

  const subtitle = (() => {
    if (step.kind === 'pick-quarter') {
      return 'Pick a previous quarter to add a missed event into.';
    }
    return `Quarter ${step.quarter}`;
  })();

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add to a past quarter"
      subtitle={subtitle}
      size="lg"
      footer={
        step.kind === 'pick-quarter' ? (
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={back}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
          </>
        )
      }
    >
      {step.kind === 'pick-quarter' && (
        <PickQuarterStep
          quarters={previous}
          onPick={q => setStep({ kind: 'pick-event', quarter: q })}
        />
      )}

      {step.kind === 'pick-event' && (
        <PickEventStep
          onPick={kind => {
            if (kind === 'foul-player')
              setStep({ kind: 'foul-pick-team', quarter: step.quarter, foulOn: 'player' });
            else if (kind === 'foul-coach')
              setStep({ kind: 'foul-pick-team', quarter: step.quarter, foulOn: 'coach' });
            else if (kind === 'foul-bench')
              setStep({ kind: 'foul-pick-team', quarter: step.quarter, foulOn: 'bench' });
            else if (kind === 'warning')
              setStep({ kind: 'warning-pick-type', quarter: step.quarter });
            else if (kind === 'timeout')
              setStep({ kind: 'timeout-pick-team', quarter: step.quarter });
            else if (kind === 'protest') {
              onPick({ kind: 'protest', quarter: step.quarter });
              reset();
            }
          }}
        />
      )}

      {step.kind === 'foul-pick-team' && (
        <PickTeamStep
          game={game}
          prompt="Which team committed the foul?"
          onPick={side => {
            if (step.foulOn === 'coach') {
              onPick({
                kind: 'foul',
                quarter: step.quarter,
                side,
                subject: { kind: 'coach' }
              });
              reset();
            } else if (step.foulOn === 'bench') {
              onPick({
                kind: 'foul',
                quarter: step.quarter,
                side,
                subject: { kind: 'bench' }
              });
              reset();
            } else {
              setStep({ kind: 'foul-pick-player', quarter: step.quarter, side });
            }
          }}
        />
      )}

      {step.kind === 'foul-pick-player' && (
        <PickPlayerStep
          game={game}
          side={step.side}
          onPick={playerId => {
            onPick({
              kind: 'foul',
              quarter: step.quarter,
              side: step.side,
              subject: { kind: 'player', playerId }
            });
            reset();
          }}
        />
      )}

      {step.kind === 'warning-pick-type' && (
        <PickWarningTypeStep
          onPick={warningType => {
            onPick({ kind: 'warning', quarter: step.quarter, warningType });
            reset();
          }}
        />
      )}

      {step.kind === 'timeout-pick-team' && (
        <PickTeamStep
          game={game}
          prompt="Which team took the timeout?"
          onPick={side => {
            onPick({ kind: 'timeout', quarter: step.quarter, side });
            reset();
          }}
        />
      )}
    </Modal>
  );
}

function PickQuarterStep({
  quarters,
  onPick
}: {
  quarters: Quarter[];
  onPick: (q: Quarter) => void;
}) {
  if (quarters.length === 0) {
    return (
      <div className="text-sm text-muted-fg">
        No previous quarters yet — past-quarter entry is only available from Q2 onwards.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {quarters.map(q => (
        <button
          key={q}
          type="button"
          onClick={() => onPick(q)}
          className={cn(
            'rounded-2xl border-2 border-border bg-surface-hi',
            'h-20 flex items-center justify-center',
            'text-2xl font-bold font-mono tabular-nums',
            'active:brightness-125 transition-none'
          )}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

type EventKind =
  | 'foul-player'
  | 'foul-coach'
  | 'foul-bench'
  | 'warning'
  | 'timeout'
  | 'protest';

function PickEventStep({ onPick }: { onPick: (kind: EventKind) => void }) {
  const items: { kind: EventKind; label: string; hint: string }[] = [
    { kind: 'foul-player', label: 'Player foul', hint: 'Personal / T / U / D on a numbered player' },
    { kind: 'foul-coach', label: 'Coach technical', hint: 'Does not count toward team fouls' },
    { kind: 'foul-bench', label: 'Bench technical', hint: 'Does not count toward team fouls' },
    { kind: 'warning', label: 'Warning', hint: 'General, time-delay, or flop' },
    { kind: 'timeout', label: 'Timeout', hint: 'Retroactive — no live timer' },
    { kind: 'protest', label: 'Protest', hint: 'Formal team protest' }
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map(it => (
        <button
          key={it.kind}
          type="button"
          onClick={() => onPick(it.kind)}
          className={cn(
            'rounded-2xl border-2 border-border bg-surface-hi p-4 text-left',
            'active:brightness-125 transition-none'
          )}
        >
          <div className="text-lg font-bold">{it.label}</div>
          <div className="text-xs text-muted-fg mt-0.5">{it.hint}</div>
        </button>
      ))}
    </div>
  );
}

function PickTeamStep({
  game,
  prompt,
  onPick
}: {
  game: Game;
  prompt: string;
  onPick: (side: Side) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-fg">{prompt}</div>
      <div className="grid grid-cols-2 gap-3">
        {(['A', 'B'] as Side[]).map(s => {
          const team = s === 'A' ? game.teamA : game.teamB;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className={cn(
                'rounded-2xl border-2 border-border p-4 text-left',
                'active:brightness-110 transition-none'
              )}
              style={{
                backgroundColor: team.jerseyColour,
                color: team.numberColour
              }}
            >
              <div className="text-[10px] uppercase tracking-widest opacity-70">
                Team {s}
              </div>
              <div className="text-xl font-bold truncate">
                {team.name || `Team ${s}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PickPlayerStep({
  game,
  side,
  onPick
}: {
  game: Game;
  side: Side;
  onPick: (playerId: string) => void;
}) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const players = sortPlayers(team.players);
  if (players.length === 0) {
    return (
      <div className="text-sm text-muted-fg">
        No players on the {team.name || `Team ${side}`} roster yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-fg">
        Pick the player from {team.name || `Team ${side}`}.
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {players.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className={cn(
              'rounded-2xl border-2 border-border p-3 text-left',
              'active:brightness-110 transition-none'
            )}
            style={{
              backgroundColor: team.jerseyColour,
              color: team.numberColour
            }}
          >
            <div className="text-2xl font-mono font-bold tabular-nums leading-tight">
              #{p.number}
            </div>
            {p.name && (
              <div className="text-xs opacity-80 truncate mt-0.5">{p.name}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PickWarningTypeStep({
  onPick
}: {
  onPick: (t: WarningType) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {WARNING_TYPES.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className={cn(
            'rounded-2xl border-2 border-border bg-surface-hi p-4 text-left',
            'active:brightness-125 transition-none'
          )}
        >
          <div className="text-lg font-bold">{WARNING_TYPE_LABEL[t]}</div>
        </button>
      ))}
    </div>
  );
}
