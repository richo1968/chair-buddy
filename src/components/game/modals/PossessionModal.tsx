import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import type { Game, Side, Team } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameClockInput, ZERO_CLOCK, isValidGameClock } from '@/components/GameClockInput';
import { cn } from '@/lib/utils';
import { useApp } from '@/state/AppProvider';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onCommit: (newDirection: Side, gameClock: string | null) => void;
}

export function PossessionModal({ open, game, onClose, onCommit }: Props) {
  if (!open) return null;
  if (game.possessionArrow === null) {
    return <InitialPossession game={game} onClose={onClose} />;
  }
  return <FlipPossession game={game} onClose={onClose} onCommit={onCommit} />;
}

function InitialPossession({
  game,
  onClose
}: {
  game: Game;
  onClose: () => void;
}) {
  const { dispatch } = useApp();
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);

  const title =
    direction === null
      ? 'Set initial possession arrow'
      : `Arrow points ${direction.toUpperCase()} — which team?`;
  const subtitle =
    direction === null
      ? 'Step 1 of 2 — which direction does the arrow point? No clock needed.'
      : 'Step 2 of 2 — pick the team. Benches will reorient if needed.';

  const commit = (team: Side) => {
    if (!direction) return;
    dispatch({ type: 'INITIAL_POSSESSION', team, direction });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="md"
      footer={
        direction !== null ? (
          <Button variant="ghost" onClick={() => setDirection(null)}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        ) : undefined
      }
    >
      {direction === null ? (
        <div className="grid grid-cols-2 gap-3">
          <DirectionButton dir="left" onClick={() => setDirection('left')} />
          <DirectionButton dir="right" onClick={() => setDirection('right')} />
        </div>
      ) : (
        <div className="space-y-3">
          <TeamButton team={game.teamA} side="A" onClick={() => commit('A')} />
          <TeamButton team={game.teamB} side="B" onClick={() => commit('B')} />
        </div>
      )}
    </Modal>
  );
}

function DirectionButton({
  dir,
  onClick
}: {
  dir: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-3xl border-2 border-danger bg-black text-danger',
        'flex flex-col items-center justify-center gap-2 py-8',
        'active:brightness-110 transition-none'
      )}
    >
      {dir === 'left' ? (
        <ArrowLeft className="w-16 h-16" strokeWidth={3.25} />
      ) : (
        <ArrowRight className="w-16 h-16" strokeWidth={3.25} />
      )}
      <span className="text-lg font-bold tracking-wide uppercase">
        {dir}
      </span>
    </button>
  );
}

function TeamButton({
  team,
  side,
  onClick
}: {
  team: Team;
  side: Side;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border-2 border-border p-4 text-left',
        'active:brightness-110 transition-none'
      )}
      style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
    >
      <div className="text-[10px] uppercase tracking-widest opacity-70">
        Team {side}
      </div>
      <div className="text-2xl font-bold truncate">
        {team.name || `Team ${side}`}
      </div>
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
  const [clock, setClock] = useState(ZERO_CLOCK);

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
