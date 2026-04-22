import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ArrowDirection, Game, Side, Team } from '@/types';
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
  onCommit: (
    newTeam: Side,
    newDirection: ArrowDirection,
    gameClock: string | null
  ) => void;
}

export function PossessionModal({ open, game, onClose, onCommit }: Props) {
  const isInitial = game.possessionArrow === null;

  const defaultDirection: ArrowDirection | null = isInitial
    ? null
    : game.arrowDirection === 'left'
      ? 'right'
      : 'left';
  const defaultTeam: Side | null = isInitial
    ? null
    : game.possessionArrow === 'A'
      ? 'B'
      : 'A';

  const [direction, setDirection] = useState<ArrowDirection | null>(defaultDirection);
  const [team, setTeam] = useState<Side | null>(defaultTeam);
  const [clock, setClock] = useState(ZERO_CLOCK);

  if (!open) return null;

  const clockValid = isInitial || isValidGameClock(clock);
  const valid = direction !== null && team !== null && clockValid;

  const title = isInitial ? 'Set initial possession arrow' : 'Change possession';
  const subtitle = isInitial
    ? 'Pre-game — no clock needed. Confirm direction and team.'
    : `Quarter ${game.currentQuarter} — logged as an event.`;

  const submit = () => {
    if (!valid) return;
    onCommit(team, direction, isInitial ? null : clock);
  };

  const leftTeam = game.layout === 'A-left' ? game.teamA : game.teamB;
  const rightTeam = game.layout === 'A-left' ? game.teamB : game.teamA;
  const leftSide: Side = game.layout === 'A-left' ? 'A' : 'B';
  const rightSide: Side = leftSide === 'A' ? 'B' : 'A';

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={submit}>
            Confirm
          </Button>
        </>
      }
    >
      <div className={cn('grid gap-5', !isInitial && 'grid-cols-[1fr_auto]')}>
        {!isInitial && (
          <GameClockInput value={clock} onChange={setClock} />
        )}

        <div className={cn('space-y-5', !isInitial && 'w-[320px]')}>
          <div>
            <div className="text-xs text-muted-fg uppercase tracking-widest mb-2">
              Arrow points
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DirButton
                dir="left"
                active={direction === 'left'}
                onClick={() => setDirection('left')}
              />
              <DirButton
                dir="right"
                active={direction === 'right'}
                onClick={() => setDirection('right')}
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-fg uppercase tracking-widest mb-2">
              Next possession
            </div>
            <div className="space-y-2">
              <TeamCard
                team={leftTeam}
                side={leftSide}
                benchSide="left"
                active={team === leftSide}
                onClick={() => setTeam(leftSide)}
              />
              <TeamCard
                team={rightTeam}
                side={rightSide}
                benchSide="right"
                active={team === rightSide}
                onClick={() => setTeam(rightSide)}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DirButton({
  dir,
  active,
  onClick
}: {
  dir: ArrowDirection;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border-2 bg-black text-danger',
        'flex flex-col items-center justify-center py-4 gap-1',
        'active:brightness-110 transition-none',
        active ? 'border-accent' : 'border-danger/60'
      )}
    >
      {dir === 'left' ? (
        <ArrowLeft className="w-10 h-10" strokeWidth={3.25} />
      ) : (
        <ArrowRight className="w-10 h-10" strokeWidth={3.25} />
      )}
      <span className="text-sm font-bold uppercase tracking-wide">
        {dir}
      </span>
    </button>
  );
}

function TeamCard({
  team,
  side,
  benchSide,
  active,
  onClick
}: {
  team: Team;
  side: Side;
  benchSide: 'left' | 'right';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border-2 p-3 text-left',
        'flex items-center gap-3',
        'active:brightness-110 transition-none',
        active ? 'border-accent' : 'border-border'
      )}
      style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
    >
      {benchSide === 'left' && <ArrowLeft className="w-4 h-4 opacity-70" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest opacity-70">
          Team {side} · bench on {benchSide}
        </div>
        <div className="text-lg font-bold truncate">
          {team.name || `Team ${side}`}
        </div>
      </div>
      {benchSide === 'right' && <ArrowRight className="w-4 h-4 opacity-70" />}
    </button>
  );
}
