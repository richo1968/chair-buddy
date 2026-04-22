import { useState } from 'react';
import type { Game, WarningTarget, WarningType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameClockInput, ZERO_CLOCK, isValidGameClock } from '@/components/GameClockInput';
import { WARNING_TYPE_LABEL } from '@/lib/events';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  type: WarningType;
  onClose: () => void;
  onCommit: (
    target: WarningTarget,
    note: string | undefined,
    gameClock: string
  ) => void;
}

export function WarningModal({ open, game, type, onClose, onCommit }: Props) {
  const [clock, setClock] = useState(ZERO_CLOCK);
  const [note, setNote] = useState('');
  const [target, setTarget] = useState<WarningTarget | null>(null);

  if (!open) return null;

  const valid = isValidGameClock(clock) && target !== null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={WARNING_TYPE_LABEL[type]}
      subtitle={`Quarter ${game.currentQuarter} — pick a team and enter the clock.`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() =>
              target && onCommit(target, note.trim() || undefined, clock)
            }
          >
            Record warning
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="text-sm text-muted-fg mb-2">Team</div>
          <div className="grid grid-cols-2 gap-3">
            {(['teamA', 'teamB'] as WarningTarget[]).map(t => {
              const side = t === 'teamA' ? 'A' : 'B';
              const team = side === 'A' ? game.teamA : game.teamB;
              const active = target === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTarget(t)}
                  className={cn(
                    'rounded-2xl border-2 p-4 text-left',
                    'active:brightness-110 transition-none',
                    active ? 'border-accent' : 'border-border'
                  )}
                  style={{
                    backgroundColor: team.jerseyColour,
                    color: team.numberColour
                  }}
                >
                  <div className="text-[10px] uppercase tracking-widest opacity-70">
                    Team {side}
                  </div>
                  <div className="text-xl font-bold">
                    {team.name || `Team ${side}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
          <GameClockInput value={clock} onChange={setClock} />
          <div className="w-[280px]">
            <label className="block text-sm text-muted-fg mb-1.5">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any detail you want to record…"
              rows={5}
              className="w-full rounded-2xl bg-surface-hi border border-border p-3 text-base resize-none"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
