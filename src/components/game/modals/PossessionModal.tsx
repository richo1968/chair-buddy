import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Game, Side, Team } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameClockInput, isValidGameClock } from '@/components/GameClockInput';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onCommit: (newDirection: Side, gameClock: string | null) => void;
}

export function PossessionModal({ open, game, onClose, onCommit }: Props) {
  if (!open) return null;
  if (game.possessionArrow === null) {
    return (
      <InitialPossession game={game} onClose={onClose} onCommit={onCommit} />
    );
  }
  return <FlipPossession game={game} onClose={onClose} onCommit={onCommit} />;
}

function InitialPossession({
  game,
  onClose,
  onCommit
}: {
  game: Game;
  onClose: () => void;
  onCommit: (side: Side, clock: string | null) => void;
}) {
  const leftIsA = game.layout === 'A-left';
  const leftSide: Side = leftIsA ? 'A' : 'B';
  const rightSide: Side = leftIsA ? 'B' : 'A';
  const leftTeam = leftIsA ? game.teamA : game.teamB;
  const rightTeam = leftIsA ? game.teamB : game.teamA;

  return (
    <Modal
      open
      onClose={onClose}
      title="Set initial possession arrow"
      subtitle="Pre-game — no clock needed. Pick the direction the arrow points."
      size="md"
    >
      <div className="space-y-3">
        <InitialButton
          direction="left"
          team={leftTeam}
          side={leftSide}
          onClick={() => onCommit(leftSide, null)}
        />
        <InitialButton
          direction="right"
          team={rightTeam}
          side={rightSide}
          onClick={() => onCommit(rightSide, null)}
        />
      </div>
    </Modal>
  );
}

function InitialButton({
  direction,
  team,
  side,
  onClick
}: {
  direction: 'left' | 'right';
  team: Team;
  side: Side;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border-2 border-border p-4',
        'flex items-center gap-4',
        'active:brightness-110 transition-none'
      )}
      style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
    >
      {direction === 'left' && <ArrowLeft className="w-10 h-10" strokeWidth={3} />}
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[10px] uppercase tracking-widest opacity-70">
          Arrow points {direction} · Team {side}
        </div>
        <div className="text-2xl font-bold truncate">
          {team.name || `Team ${side}`}
        </div>
      </div>
      {direction === 'right' && <ArrowRight className="w-10 h-10" strokeWidth={3} />}
    </button>
  );
}

function FlipPossession({
  game,
  onClose,
  onCommit
}: {
  game: Game;
  onClose: () => void;
  onCommit: (side: Side, clock: string | null) => void;
}) {
  const flipTarget: Side = game.possessionArrow === 'A' ? 'B' : 'A';
  const [choice, setChoice] = useState<Side>(flipTarget);
  const [clock, setClock] = useState(game.lastGameClock);

  const valid = isValidGameClock(clock);

  return (
    <Modal
      open
      onClose={onClose}
      title="Flip possession"
      subtitle={`Quarter ${game.currentQuarter} — logged as an in-game event.`}
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
          <div className="text-sm text-muted-fg">Arrow to</div>
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
