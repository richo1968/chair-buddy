import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ClipboardList,
  Download,
  Flag,
  Play,
  RotateCcw,
  Timer,
  type LucideIcon
} from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { Button } from '@/components/ui/Button';
import {
  coachStatus,
  playerFoulStats,
  quarterOrder,
  sortEvents,
  totalScore
} from '@/lib/game';
import { describeEvent } from '@/lib/events';
import { downloadTextFile, exportGameAsText } from '@/lib/export';
import { cn } from '@/lib/utils';
import type { Game, GameEvent, Side, Team } from '@/types';

export function ReviewScreen() {
  const { dispatch, activeGame } = useApp();
  if (!activeGame) return null;

  const totA = totalScore(activeGame, 'A');
  const totB = totalScore(activeGame, 'B');
  const events = sortEvents(activeGame.events);

  const download = () => {
    const text = exportGameAsText(activeGame);
    const safe = (s: string) =>
      (s.trim() || 'team').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `${activeGame.date}_${safe(activeGame.teamA.name)}_vs_${safe(activeGame.teamB.name)}.txt`;
    downloadTextFile(filename, text);
  };

  return (
    <div className="min-h-full w-full bg-bg text-fg p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="flex items-center gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="md"
            onClick={() => dispatch({ type: 'GO_HOME' })}
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
          <div className="flex-1" />
          <Button variant="secondary" size="md" onClick={download}>
            <Download className="w-4 h-4" />
            Export .txt
          </Button>
          {activeGame.finished ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                dispatch({ type: 'REOPEN_GAME', id: activeGame.id });
                dispatch({ type: 'OPEN_GAME', id: activeGame.id });
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Reopen &amp; continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                dispatch({ type: 'OPEN_GAME', id: activeGame.id })
              }
            >
              <Play className="w-4 h-4" />
              Resume
            </Button>
          )}
        </header>

        <section className="rounded-3xl border border-border bg-surface p-5">
          <div className="text-xs text-muted-fg uppercase tracking-widest mb-3">
            {activeGame.finished ? 'Final' : 'Live — viewing only'}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <TeamBadge team={activeGame.teamA} side="A" />
            <div className="text-center font-mono tabular-nums">
              <div className="text-5xl font-black">
                {totA} <span className="text-muted-fg">–</span> {totB}
              </div>
              <div className="text-xs text-muted-fg mt-1 tracking-wider">
                FINAL SCORE
              </div>
            </div>
            <TeamBadge team={activeGame.teamB} side="B" flip />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-fg">
            <span>{activeGame.date}</span>
            {activeGame.division && <span>· {activeGame.division}</span>}
            <span>
              · {activeGame.teamA.players.length} vs{' '}
              {activeGame.teamB.players.length} players
            </span>
            <span>· {events.length} events</span>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-surface p-5">
          <SectionTitle>Quarter scores</SectionTitle>
          <QuartersTable game={activeGame} />
        </section>

        <div className="grid grid-cols-2 gap-4">
          <section className="rounded-3xl border border-border bg-surface p-5">
            <SectionTitle>
              {activeGame.teamA.name || 'Team A'} — Fouls
            </SectionTitle>
            <PlayerFoulList game={activeGame} side="A" />
          </section>
          <section className="rounded-3xl border border-border bg-surface p-5">
            <SectionTitle>
              {activeGame.teamB.name || 'Team B'} — Fouls
            </SectionTitle>
            <PlayerFoulList game={activeGame} side="B" />
          </section>
        </div>

        <section className="rounded-3xl border border-border bg-surface p-5">
          <SectionTitle>Event log</SectionTitle>
          <EventList events={events} game={activeGame} />
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-fg uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}

function TeamBadge({
  team,
  side,
  flip = false
}: {
  team: Team;
  side: Side;
  flip?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4 flex items-center gap-3',
        flip ? 'flex-row-reverse text-right' : ''
      )}
      style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
    >
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest opacity-70">
          Team {side}
        </div>
        <div className="text-2xl font-bold truncate">
          {team.name || `Team ${side}`}
        </div>
      </div>
    </div>
  );
}

function QuartersTable({ game }: { game: Game }) {
  const rows = [...game.quarterScores].sort(
    (a, b) => quarterOrder(a.quarter) - quarterOrder(b.quarter)
  );
  const totA = totalScore(game, 'A');
  const totB = totalScore(game, 'B');
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="grid grid-cols-[80px_1fr_1fr] px-3 py-2 bg-surface-hi text-xs uppercase tracking-wider text-muted-fg border-b border-border">
        <div>Qtr</div>
        <div
          className="text-right font-semibold"
          style={{ color: game.teamA.jerseyColour }}
        >
          {game.teamA.name || 'Team A'}
        </div>
        <div
          className="text-right font-semibold"
          style={{ color: game.teamB.jerseyColour }}
        >
          {game.teamB.name || 'Team B'}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-fg italic">
          No quarter scores recorded.
        </div>
      ) : (
        rows.map(qs => (
          <div
            key={qs.quarter}
            className="grid grid-cols-[80px_1fr_1fr] px-3 py-2 border-b border-border/60 last:border-b-0"
          >
            <div className="font-semibold">{qs.quarter}</div>
            <div className="text-right font-mono tabular-nums">
              {qs.teamAScore}
            </div>
            <div className="text-right font-mono tabular-nums">
              {qs.teamBScore}
            </div>
          </div>
        ))
      )}
      <div className="grid grid-cols-[80px_1fr_1fr] px-3 py-2 border-t border-border bg-surface-hi font-bold">
        <div>Total</div>
        <div className="text-right font-mono tabular-nums text-lg">{totA}</div>
        <div className="text-right font-mono tabular-nums text-lg">{totB}</div>
      </div>
    </div>
  );
}

function PlayerFoulList({ game, side }: { game: Game; side: Side }) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const coach = coachStatus(game, side);

  return (
    <div className="space-y-3">
      {team.players.length === 0 ? (
        <div className="text-sm text-muted-fg italic">(no players)</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {team.players.map(p => {
            const stats = playerFoulStats(game, p.id);
            return (
              <li
                key={p.id}
                className="py-1.5 flex items-center gap-3"
              >
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black"
                  style={{
                    backgroundColor: team.jerseyColour,
                    color: team.numberColour
                  }}
                >
                  {p.number}
                </span>
                <span className="flex-1 truncate text-sm">
                  {p.name || <span className="text-muted-fg">—</span>}
                </span>
                <span className="font-mono tabular-nums text-sm text-muted-fg">
                  {[
                    stats.personal > 0 && `${stats.personal}P`,
                    stats.technical > 0 && `${stats.technical}T`,
                    stats.unsportsmanlike > 0 && `${stats.unsportsmanlike}U`,
                    stats.disqualifying > 0 && `${stats.disqualifying}DQ`
                  ]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </span>
                <span
                  className={cn(
                    'w-12 text-right font-mono font-bold text-base tabular-nums',
                    stats.ejected && 'text-danger'
                  )}
                >
                  {stats.total}F
                </span>
                {stats.ejected && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger text-white">
                    {stats.ejectedReason === 'dq' ? 'DQ' : 'OUT'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="pt-2 border-t border-border text-sm space-y-0.5">
        <div className="flex justify-between">
          <span className="text-muted-fg">Coach techs</span>
          <span className="font-mono tabular-nums">{coach.coachTechs}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-fg">Bench techs</span>
          <span className="font-mono tabular-nums">{coach.benchTechs}</span>
        </div>
        {coach.ejected && (
          <div className="pt-1">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger text-white">
              Coach EJECTED
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function iconFor(ev: GameEvent): { Icon: LucideIcon; tint: string } {
  switch (ev.kind) {
    case 'foul':
      return { Icon: Flag, tint: 'text-danger' };
    case 'warning':
      return { Icon: AlertTriangle, tint: 'text-warn' };
    case 'possessionChange':
      return { Icon: ArrowLeftRight, tint: 'text-danger' };
    case 'quarterScoreRecorded':
      return { Icon: ClipboardList, tint: 'text-accent' };
    case 'timeout':
      return { Icon: Timer, tint: 'text-fg' };
  }
}

function EventList({ events, game }: { events: GameEvent[]; game: Game }) {
  if (events.length === 0) {
    return <div className="text-sm text-muted-fg italic">(no events)</div>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {events.map(ev => {
        const { Icon, tint } = iconFor(ev);
        return (
          <li
            key={ev.id}
            className="py-1.5 flex items-center gap-2 text-sm"
          >
            <span className={cn('w-5 h-5 flex items-center justify-center shrink-0', tint)}>
              <Icon className="w-4 h-4" strokeWidth={2.25} />
            </span>
            <span className="text-xs font-mono text-muted-fg w-[72px] tabular-nums shrink-0">
              {ev.quarter} · {ev.gameClock}
            </span>
            <span className="flex-1">{describeEvent(ev, game)}</span>
          </li>
        );
      })}
    </ul>
  );
}
