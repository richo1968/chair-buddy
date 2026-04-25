import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type {
  ArrowDirection,
  Game,
  PossessionReason,
  Side,
  Team
} from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  GameClockInput,
  ZERO_CLOCK,
  isValidGameClock
} from '@/components/GameClockInput';
import {
  POSSESSION_REASON_LABEL,
  POSSESSION_REASONS
} from '@/lib/events';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onCommit: (
    newTeam: Side,
    newDirection: ArrowDirection,
    gameClock: string | null,
    reason: PossessionReason | null
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

  // Default reason for in-game flips. If no possession-change event exists yet
  // for the current quarter AND it isn't Q1 (which begins with a jump ball,
  // not a throw-in), the next change is most likely the start-of-period
  // throw-in. Otherwise default to 'held-ball' which covers the bulk of
  // mid-game arrow flips.
  const defaultReason: PossessionReason = (() => {
    const hasArrowEventThisQuarter = game.events.some(
      e =>
        e.kind === 'possessionChange' &&
        e.quarter === game.currentQuarter &&
        !e.halftimeFlip
    );
    if (!hasArrowEventThisQuarter && game.currentQuarter !== 'Q1') {
      return 'quarter-start';
    }
    return 'held-ball';
  })();

  const [direction, setDirection] = useState<ArrowDirection | null>(defaultDirection);
  const [team, setTeam] = useState<Side | null>(defaultTeam);
  const [clock, setClock] = useState(ZERO_CLOCK);
  const [reason, setReason] = useState<PossessionReason>(defaultReason);

  if (!open) return null;

  const clockValid = isInitial || isValidGameClock(clock);
  const valid = direction !== null && team !== null && clockValid;

  const title = isInitial ? 'Set initial possession arrow' : 'Change possession';
  const subtitle = isInitial
    ? 'Pre-game — no clock needed. Confirm direction and team.'
    : `Quarter ${game.currentQuarter} — logged as an event.`;

  const submit = () => {
    if (!valid) return;
    onCommit(team, direction, isInitial ? null : clock, isInitial ? null : reason);
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

        <div className={cn('space-y-5', !isInitial && 'w-[340px]')}>
          {!isInitial && (
            <div>
              <div className="text-xs text-muted-fg uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Reason (FIBA Rule 12)</span>
                <span className="normal-case tracking-normal text-[10px] text-accent font-semibold">
                  smart default
                </span>
              </div>
              <div className="space-y-1.5">
                {POSSESSION_REASONS.map(r => (
                  <ReasonOption
                    key={r}
                    value={r}
                    label={POSSESSION_REASON_LABEL[r]}
                    active={reason === r}
                    onClick={() => setReason(r)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-muted-fg uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Arrow points</span>
              {!isInitial && (
                <span className="normal-case tracking-normal text-[10px] text-accent font-semibold">
                  auto-flipped — tap to override
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DirButton
                dir="left"
                active={direction === 'left'}
                emphasised={!isInitial && direction === 'left'}
                onClick={() => setDirection('left')}
              />
              <DirButton
                dir="right"
                active={direction === 'right'}
                emphasised={!isInitial && direction === 'right'}
                onClick={() => setDirection('right')}
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-fg uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Next possession</span>
              {!isInitial && (
                <span className="normal-case tracking-normal text-[10px] text-accent font-semibold">
                  auto-flipped — tap to override
                </span>
              )}
            </div>
            <div className="space-y-2">
              <TeamCard
                team={leftTeam}
                side={leftSide}
                benchSide="left"
                active={team === leftSide}
                emphasised={!isInitial && team === leftSide}
                onClick={() => setTeam(leftSide)}
              />
              <TeamCard
                team={rightTeam}
                side={rightSide}
                benchSide="right"
                active={team === rightSide}
                emphasised={!isInitial && team === rightSide}
                onClick={() => setTeam(rightSide)}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ReasonOption({
  value: _value,
  label,
  active,
  onClick
}: {
  value: PossessionReason;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold',
        'flex items-center gap-2',
        'active:brightness-110 transition-none',
        active
          ? 'border-accent bg-accent/15 text-fg'
          : 'border-border bg-surface text-muted-fg'
      )}
    >
      <span
        className={cn(
          'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
          active ? 'border-accent bg-accent' : 'border-border'
        )}
      >
        {active && <span className="w-1.5 h-1.5 rounded-full bg-bg" />}
      </span>
      <span className="flex-1 leading-tight">{label}</span>
    </button>
  );
}

function DirButton({
  dir,
  active,
  emphasised,
  onClick
}: {
  dir: ArrowDirection;
  active: boolean;
  emphasised?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-2xl bg-black text-danger',
        'flex flex-col items-center justify-center py-4 gap-1',
        'active:brightness-110 transition-none',
        active
          ? emphasised
            ? 'border-4 border-accent ring-4 ring-accent/30'
            : 'border-4 border-accent'
          : 'border-2 border-danger/40 opacity-55'
      )}
    >
      {active && (
        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-bg flex items-center justify-center">
          <Check className="w-3 h-3" strokeWidth={3.5} />
        </span>
      )}
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
  emphasised,
  onClick
}: {
  team: Team;
  side: Side;
  benchSide: 'left' | 'right';
  active: boolean;
  emphasised?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full rounded-2xl p-3 text-left',
        'flex items-center gap-3',
        'active:brightness-110 transition-none',
        active
          ? emphasised
            ? 'border-4 border-accent ring-4 ring-accent/30'
            : 'border-4 border-accent'
          : 'border-2 border-border opacity-55'
      )}
      style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
    >
      {active && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent text-bg flex items-center justify-center">
          <Check className="w-3 h-3" strokeWidth={3.5} />
        </span>
      )}
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
