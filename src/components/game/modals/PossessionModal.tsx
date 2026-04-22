import { useState } from 'react';
import type { Game, Side } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameClockInput, isValidGameClock } from '@/components/GameClockInput';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onCommit: (newDirection: Side, gameClock: string) => void;
}

export function PossessionModal({ open, game, onClose, onCommit }: Props) {
  const flipTarget: Side = game.possessionArrow === 'A' ? 'B' : 'A';
  const [choice, setChoice] = useState<Side>(flipTarget);
  const [clock, setClock] = useState(game.lastGameClock);

  if (!open) return null;

  const valid = isValidGameClock(clock);
  const title =
    game.possessionArrow === null ? 'Set possession arrow' : 'Flip possession';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={`Quarter ${game.currentQuarter}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={() => onCommit(choice, clock)}>
            Confirm
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <GameClockInput value={clock} onChange={setClock} />
        <div className="w-[280px] space-y-3">
          <div className="text-sm text-muted-fg">Possession to</div>
          {(['A', 'B'] as Side[]).map(s => {
            const team = s === 'A' ? game.teamA : game.teamB;
            const active = choice === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setChoice(s)}
                className={cn(
                  'w-full rounded-2xl border-2 px-4 py-4 text-left',
                  'active:brightness-110 transition-none',
                  active ? 'border-accent' : 'border-border'
                )}
                style={{
                  backgroundColor: team.jerseyColour,
                  color: team.numberColour
                }}
              >
                <div className="text-[10px] uppercase tracking-widest opacity-70">
                  Team {s}
                </div>
                <div className="text-xl font-bold">
                  {team.name || `Team ${s}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
