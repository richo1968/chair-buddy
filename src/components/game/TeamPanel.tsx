import { Users, Palette, Timer } from 'lucide-react';
import type { FoulSubject, Game, GameEvent, Side } from '@/types';
import { PlayerTile } from './PlayerTile';
import { StaffChip } from './StaffChip';
import { TeamEventLog } from './TeamEventLog';
import {
  coachStatus,
  playerFoulStats,
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
}

export function TeamPanel({
  game,
  side,
  onFoulSubject,
  onTimeout,
  onOpenPlayers,
  onOpenColours,
  onEventTap
}: Props) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const teamFouls = teamFoulsForQuarter(game, side, game.currentQuarter);
  const inBonus = teamFouls >= 5;
  const coach = coachStatus(game, side);
  const benchWarning = !coach.ejected && coach.coachTechs + coach.benchTechs >= 2;
  const timeouts = timeoutStatus(game, side);

  return (
    <div className="flex flex-col gap-2 h-full min-w-0">
      <button
        type="button"
        onClick={onOpenColours}
        className="rounded-2xl border border-border px-3 py-2 flex items-center justify-between gap-2 active:brightness-110 transition-none text-left"
        style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest opacity-70">
            Team {side}
          </div>
          <div className="text-lg font-bold truncate">
            {team.name || `Team ${side}`}
          </div>
        </div>
        <Palette className="w-4 h-4 opacity-70 shrink-0" />
      </button>

      <div
        className={cn(
          'rounded-2xl border flex items-center justify-between px-3 py-1',
          inBonus
            ? 'bg-warn/20 border-warn text-warn'
            : 'bg-surface border-border text-fg'
        )}
      >
        <div className="text-[10px] uppercase tracking-widest opacity-80">
          {game.currentQuarter} fouls
        </div>
        <div className="font-mono font-black text-xl">
          {teamFouls}
          {inBonus && <span className="ml-1 text-[10px] font-bold">BONUS</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <StaffChip
          label="COACH"
          techs={coach.coachTechs}
          ejected={coach.ejected}
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

      <div className="flex-1 min-h-0 flex flex-col gap-2">
        {team.players.length === 0 ? (
          <div className="shrink-0 rounded-2xl border border-dashed border-border flex items-center justify-center text-sm text-muted-fg p-3 text-center">
            No players yet. Tap "Manage players" to add.
          </div>
        ) : (
          <div className="shrink-0 max-h-[50%] overflow-auto">
            <div className="grid grid-cols-4 gap-1.5 content-start">
              {team.players.map(p => (
                <PlayerTile
                  key={p.id}
                  player={p}
                  stats={playerFoulStats(game, p.id)}
                  jerseyColour={team.jerseyColour}
                  numberColour={team.numberColour}
                  onClick={() =>
                    onFoulSubject({ kind: 'player', playerId: p.id })
                  }
                />
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0">
          <TeamEventLog game={game} side={side} onEventTap={onEventTap} />
        </div>
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
