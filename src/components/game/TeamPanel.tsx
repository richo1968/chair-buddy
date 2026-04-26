import { useRef } from 'react';
import { Users, Pencil, Timer, GripHorizontal } from 'lucide-react';
import type { FoulSubject, Game, GameEvent, Side } from '@/types';
import { PlayerTile } from './PlayerTile';
import { StaffChip } from './StaffChip';
import { TeamEventLog } from './TeamEventLog';
import {
  coachStatus,
  playerFoulStats,
  sortPlayers,
  teamFoulsForQuarter,
  timeoutStatus
} from '@/lib/game';
import { cn } from '@/lib/utils';

interface Props {
  game: Game;
  side: Side;
  onFoulSubject: (subject: FoulSubject) => void;
  onTimeout: () => void;
  onOpenPlayers: () => void;
  onOpenColours: () => void;
  onEventTap: (event: GameEvent) => void;
  /** 0..1 — fraction of the split area used by the event log (vs player grid). */
  logRatio: number;
  onLogRatioChange: (ratio: number) => void;
}

export function TeamPanel({
  game,
  side,
  onFoulSubject,
  onTimeout,
  onOpenPlayers,
  onOpenColours,
  onEventTap,
  logRatio,
  onLogRatioChange
}: Props) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const teamFouls = teamFoulsForQuarter(game, side, game.currentQuarter);
  const inBonus = teamFouls >= 5;
  const bonusNext = teamFouls === 4;
  const coach = coachStatus(game, side);
  const benchWarning = !coach.ejected && coach.coachTechs + coach.benchTechs >= 2;
  const timeouts = timeoutStatus(game, side);

  const splitRef = useRef<HTMLDivElement>(null);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.height <= 0) return;

    const onMove = (ev: PointerEvent) => {
      const cursor = ev.clientY - rect.top;
      const ratio = 1 - cursor / rect.height;
      onLogRatioChange(Math.min(0.85, Math.max(0.1, ratio)));
    };
    const onEnd = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    document.body.style.cursor = 'row-resize';
  };

  return (
    <div className="flex flex-col gap-2 h-full min-w-0 overflow-hidden">
      <button
        type="button"
        onClick={onOpenColours}
        className="rounded-2xl border border-border px-3 py-2 flex items-center justify-between gap-2 active:brightness-110 transition-none text-left"
        style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
        title="Edit team name, jersey colour, and coach names"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest opacity-70">
            Team {side}
          </div>
          <div className="text-lg font-bold truncate leading-tight">
            {team.name || `Team ${side}`}
          </div>
          <div className="text-[11px] opacity-70 truncate mt-0.5">
            {team.coachName
              ? `Coach: ${team.coachName}`
              : '+ Tap to add coach name'}
          </div>
        </div>
        <Pencil className="w-4 h-4 opacity-70 shrink-0" />
      </button>

      <div
        className={cn(
          'rounded-2xl border flex items-center justify-between px-3 py-1',
          inBonus
            ? 'bg-danger/20 border-danger text-danger'
            : bonusNext
              ? 'bg-warn/20 border-warn text-warn'
              : 'bg-surface border-border text-fg'
        )}
      >
        <div className="text-[10px] uppercase tracking-widest opacity-80">
          {game.currentQuarter} fouls
        </div>
        <div className="font-mono font-black text-xl flex items-baseline gap-1">
          {teamFouls}
          {inBonus && <span className="text-[10px] font-bold">BONUS</span>}
          {bonusNext && <span className="text-[10px] font-bold">NEXT</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <StaffChip
          label="COACH"
          techs={coach.coachTechs}
          ejected={coach.ejected}
          subLabel={team.coachName}
          jerseyColour={team.jerseyColour}
          numberColour={team.numberColour}
          onClick={() => onFoulSubject({ kind: 'coach' })}
        />
        <StaffChip
          label="BENCH"
          techs={coach.benchTechs}
          warning={benchWarning && !coach.ejected}
          jerseyColour={team.jerseyColour}
          numberColour={team.numberColour}
          onClick={() => onFoulSubject({ kind: 'bench' })}
        />
        <TimeoutButton
          remaining={timeouts.remaining}
          max={timeouts.max}
          phase={timeouts.phaseLabel}
          jerseyColour={team.jerseyColour}
          numberColour={team.numberColour}
          onClick={onTimeout}
        />
      </div>

      <div
        ref={splitRef}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        {team.players.length === 0 ? (
          <>
            <div className="shrink-0 rounded-2xl border border-dashed border-border flex items-center justify-center text-sm text-muted-fg p-3 text-center mb-2">
              No players yet. Tap "Manage players" to add.
            </div>
            <TeamEventLog
              game={game}
              side={side}
              onEventTap={onEventTap}
              className="flex-1 min-h-0"
            />
          </>
        ) : (
          <>
            <div
              className="overflow-y-auto"
              style={{ flex: `${1 - logRatio} 1 0`, minHeight: 0 }}
            >
              <div className="grid grid-cols-4 gap-1.5 content-start">
                {sortPlayers(team.players).map(p => (
                  <PlayerTile
                    key={p.id}
                    player={p}
                    stats={playerFoulStats(game, p.id)}
                    isCaptain={team.captainId === p.id}
                    jerseyColour={team.jerseyColour}
                    numberColour={team.numberColour}
                    onClick={() =>
                      onFoulSubject({ kind: 'player', playerId: p.id })
                    }
                  />
                ))}
              </div>
            </div>
            <DragHandle onPointerDown={startDrag} />
            <div
              style={{ flex: `${logRatio} 1 0`, minHeight: 0 }}
              className="min-h-0"
            >
              <TeamEventLog
                game={game}
                side={side}
                onEventTap={onEventTap}
                className="h-full"
              />
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenPlayers}
        className="tap-target rounded-2xl border border-border bg-surface-hi flex items-center justify-center gap-2 text-sm font-semibold active:brightness-125 transition-none"
      >
        <Users className="w-4 h-4" />
        Manage players
      </button>
    </div>
  );
}

function DragHandle({
  onPointerDown
}: {
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize log and player grid"
      onPointerDown={onPointerDown}
      className={cn(
        'shrink-0 my-1 h-3 flex items-center justify-center',
        'cursor-row-resize touch-none rounded-md',
        'active:bg-accent/25 hover:bg-surface-hi'
      )}
    >
      <GripHorizontal className="w-6 h-3 text-muted-fg/70" strokeWidth={2.5} />
    </div>
  );
}

function TimeoutButton({
  remaining,
  max,
  phase,
  jerseyColour,
  numberColour,
  onClick
}: {
  remaining: number;
  max: number;
  phase: string;
  jerseyColour: string;
  numberColour: string;
  onClick: () => void;
}) {
  const none = remaining === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={none}
      className={cn(
        'flex-1 rounded-2xl px-2 py-2 text-left min-h-tap',
        'active:brightness-110 transition-none disabled:opacity-40',
        'border-2 border-border'
      )}
      style={{ backgroundColor: jerseyColour, color: numberColour }}
      title={`${phase}: ${remaining} of ${max} timeouts left`}
    >
      <div className="text-[10px] uppercase tracking-widest font-semibold opacity-75 flex items-center gap-1">
        <Timer className="w-3 h-3" />
        T/O
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono font-black text-xl leading-none">
          {remaining}
        </span>
        <span className="text-[10px] opacity-75">/{max}</span>
      </div>
    </button>
  );
}
