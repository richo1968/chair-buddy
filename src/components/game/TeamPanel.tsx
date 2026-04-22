import { Users, Palette } from 'lucide-react';
import type { FoulSubject, Game, Side } from '@/types';
import { PlayerTile } from './PlayerTile';
import { StaffChip } from './StaffChip';
import {
  coachStatus,
  playerFoulStats,
  teamFoulsForQuarter
} from '@/lib/game';
import { cn } from '@/lib/utils';

interface Props {
  game: Game;
  side: Side;
  onFoulSubject: (subject: FoulSubject) => void;
  onOpenPlayers: () => void;
  onOpenColours: () => void;
}

export function TeamPanel({
  game,
  side,
  onFoulSubject,
  onOpenPlayers,
  onOpenColours
}: Props) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const teamFouls = teamFoulsForQuarter(game, side, game.currentQuarter);
  const inBonus = teamFouls >= 5;
  const coach = coachStatus(game, side);
  const benchWarning = !coach.ejected && coach.coachTechs + coach.benchTechs >= 2;

  return (
    <div className="flex flex-col gap-2 h-full min-w-0">
      <button
        type="button"
        onClick={onOpenColours}
        className="rounded-2xl border border-border px-4 py-3 flex items-center justify-between gap-2 active:brightness-110 transition-none text-left"
        style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest opacity-70">
            Team {side}
          </div>
          <div className="text-xl font-bold truncate">
            {team.name || `Team ${side}`}
          </div>
        </div>
        <Palette className="w-4 h-4 opacity-70 shrink-0" />
      </button>

      <div
        className={cn(
          'rounded-2xl border flex items-center justify-between px-4 py-1.5',
          inBonus
            ? 'bg-warn/20 border-warn text-warn'
            : 'bg-surface border-border text-fg'
        )}
      >
        <div className="text-xs uppercase tracking-widest opacity-80">
          {game.currentQuarter} Team fouls
        </div>
        <div className="font-mono font-black text-2xl">
          {teamFouls}
          {inBonus && <span className="ml-2 text-xs font-bold">BONUS</span>}
        </div>
      </div>

      <div className="flex gap-2">
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
      </div>

      <div className="flex-1 min-h-0">
        {team.players.length === 0 ? (
          <div className="h-full rounded-2xl border border-dashed border-border flex items-center justify-center text-sm text-muted-fg p-4 text-center">
            No players yet. Tap "Manage players" to add.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 h-full content-start overflow-auto">
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
        )}
      </div>

      <button
        type="button"
        onClick={onOpenPlayers}
        className="tap-target rounded-2xl border border-border bg-surface-hi flex items-center justify-center gap-2 text-base font-semibold active:brightness-125 transition-none"
      >
        <Users className="w-5 h-5" />
        Manage players
      </button>
    </div>
  );
}
