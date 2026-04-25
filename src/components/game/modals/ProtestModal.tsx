import { useState } from 'react';
import { AlertOctagon } from 'lucide-react';
import type { Game, Side } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  GameClockInput,
  ZERO_CLOCK,
  isValidGameClock
} from '@/components/GameClockInput';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onCommit: (team: Side, reason: string, gameClock: string) => void;
}

export function ProtestModal({ open, game, onClose, onCommit }: Props) {
  const [team, setTeam] = useState<Side | null>(null);
  const [reason, setReason] = useState('');
  const [clock, setClock] = useState(ZERO_CLOCK);

  if (!open) return null;

  const valid = team !== null && isValidGameClock(clock) && reason.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Log a protest"
      subtitle="A formal team protest, recorded by the chair (FIBA Internal Regulations B.4)."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!valid}
            onClick={() => team && onCommit(team, reason.trim(), clock)}
          >
            <AlertOctagon className="w-4 h-4" />
            Record protest
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <GameClockInput value={clock} onChange={setClock} />
        <div className="w-[300px] space-y-3">
          <div>
            <div className="text-sm text-muted-fg mb-2">Team protesting</div>
            <div className="grid grid-cols-2 gap-2">
              {(['A', 'B'] as Side[]).map(s => {
                const t = s === 'A' ? game.teamA : game.teamB;
                const active = team === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTeam(s)}
                    className={cn(
                      'rounded-2xl border-2 p-3 text-left',
                      'active:brightness-110 transition-none',
                      active ? 'border-accent ring-2 ring-accent/30' : 'border-border'
                    )}
                    style={{
                      backgroundColor: t.jerseyColour,
                      color: t.numberColour
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-widest opacity-70">
                      Team {s}
                    </div>
                    <div className="text-base font-bold truncate">
                      {t.name || `Team ${s}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="block text-sm text-muted-fg mb-1.5">
              Reason / circumstances
            </span>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={5}
              placeholder="Captain's name, what they're protesting, and the circumstances at this moment in the game."
              className="w-full rounded-2xl bg-surface-hi border border-border p-3 text-sm resize-none"
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}
