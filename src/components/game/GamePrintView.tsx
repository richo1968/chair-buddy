/**
 * GamePrintView — hidden on screen, shown only during window.print().
 *
 * Uses entirely explicit hex colours (no CSS variables) so the PDF looks
 * correct regardless of whether the app is in dark or light mode.
 */
import type { Game, Officials, Side } from '@/types';
import {
  coachStatus,
  gameOutcomeLabel,
  isGameFinished,
  playerFoulStats,
  quarterOrder,
  sortEvents,
  sortPlayers,
  totalScore
} from '@/lib/game';
import { describeEvent } from '@/lib/events';

// ─── Design tokens (all explicit for PDF) ───────────────────────────────────
const C = {
  black:    '#111827',
  body:     '#374151',
  muted:    '#6b7280',
  faint:    '#9ca3af',
  rule:     '#e5e7eb',
  ruleHeavy:'#d1d5db',
  white:    '#ffffff',
  accent:   '#f97316',   // orange — matches app accent
  danger:   '#dc2626',
  warn:     '#d97706',
  success:  '#16a34a',
  blue:     '#2563eb',
};

// ─── Shared style objects ─────────────────────────────────────────────────────
const S = {
  root: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: '9pt',
    color: C.body,
    backgroundColor: C.white,
    lineHeight: 1.45,
  } as React.CSSProperties,

  sectionHead: {
    fontSize: '7pt',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: C.muted,
    borderBottom: `1.5px solid ${C.ruleHeavy}`,
    paddingBottom: '3pt',
    marginTop: '14pt',
    marginBottom: '7pt',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '9pt',
  } as React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: '7.5pt',
    color: C.muted,
    paddingBottom: '3pt',
    borderBottom: `1px solid ${C.rule}`,
  } as React.CSSProperties,

  thRight: {
    textAlign: 'right' as const,
    fontWeight: 600,
    fontSize: '7.5pt',
    color: C.muted,
    paddingBottom: '3pt',
    borderBottom: `1px solid ${C.rule}`,
  } as React.CSSProperties,

  td: {
    padding: '3pt 4pt 3pt 0',
    borderBottom: `0.5px solid ${C.rule}`,
    verticalAlign: 'top' as const,
  } as React.CSSProperties,

  tdRight: {
    padding: '3pt 0 3pt 4pt',
    borderBottom: `0.5px solid ${C.rule}`,
    textAlign: 'right' as const,
    verticalAlign: 'top' as const,
  } as React.CSSProperties,

  mono: {
    fontFamily: 'Menlo, Consolas, "Courier New", monospace',
    fontVariantNumeric: 'tabular-nums',
  } as React.CSSProperties,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TeamSwatch({ colour, size = 10 }: { colour: string; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 2,
        backgroundColor: colour,
        verticalAlign: 'middle',
        marginRight: 5,
        flexShrink: 0,
      }}
    />
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <div style={S.sectionHead}>{children}</div>;
}

function eventKindLabel(kind: string): { label: string; color: string } {
  switch (kind) {
    case 'foul':               return { label: 'FOUL',   color: C.danger };
    case 'warning':            return { label: 'WARN',   color: C.warn };
    case 'possessionChange':   return { label: 'POSS',   color: C.blue };
    case 'quarterScoreRecorded': return { label: 'SCORE', color: C.success };
    case 'timeout':            return { label: 'T/O',    color: C.muted };
    case 'protest':            return { label: 'PROTEST',color: C.danger };
    default:                   return { label: '—',      color: C.muted };
  }
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function QuarterScoresSection({ game }: { game: Game }) {
  const rows = [...game.quarterScores].sort(
    (a, b) => quarterOrder(a.quarter) - quarterOrder(b.quarter)
  );
  const totA = totalScore(game, 'A');
  const totB = totalScore(game, 'B');
  const nameA = game.teamA.name || 'Team A';
  const nameB = game.teamB.name || 'Team B';

  if (rows.length === 0) return null;

  const quarters = rows.map(r => r.quarter);

  return (
    <>
      <SectionHead>Quarter scores</SectionHead>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, width: 140 }}>Team</th>
            {quarters.map(q => (
              <th key={q} style={{ ...S.thRight, width: 36 }}>{q}</th>
            ))}
            <th style={{ ...S.thRight, width: 46, color: C.black, fontWeight: 700 }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {[
            { side: 'A' as Side, name: nameA, colour: game.teamA.jerseyColour, tot: totA },
            { side: 'B' as Side, name: nameB, colour: game.teamB.jerseyColour, tot: totB },
          ].map(({ side, name, colour, tot }) => (
            <tr key={side}>
              <td style={S.td}>
                <TeamSwatch colour={colour} />
                <span style={{ fontWeight: 600 }}>{name}</span>
              </td>
              {rows.map(r => (
                <td key={r.quarter} style={{ ...S.tdRight, ...S.mono }}>
                  {side === 'A' ? r.teamAScore : r.teamBScore}
                </td>
              ))}
              <td style={{ ...S.tdRight, ...S.mono, fontWeight: 700, fontSize: '10pt' }}>
                {tot}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function OfficialsSection({ officials }: { officials: Officials }) {
  const rows: Array<[string, keyof Officials]> = [
    ['Crew Chief', 'crewChief'],
    ['Umpire 1', 'umpire1'],
    ['Umpire 2', 'umpire2'],
    ['Commissioner', 'commissioner'],
    ['Scorer', 'scorer'],
    ['Asst Scorer', 'assistantScorer'],
    ['Timer', 'timer'],
    ['Shot Clock', 'shotClockOperator'],
  ];
  const filled = rows.filter(([, k]) => {
    const v = officials[k];
    return v && v.trim();
  });
  if (filled.length === 0) return null;

  // 2-column grid
  const col1 = filled.slice(0, Math.ceil(filled.length / 2));
  const col2 = filled.slice(Math.ceil(filled.length / 2));

  return (
    <>
      <SectionHead>Table officials</SectionHead>
      <div style={{ display: 'flex', gap: '24pt' }}>
        {[col1, col2].map((col, i) => (
          <div key={i} style={{ flex: 1 }}>
            {col.map(([label, key]) => (
              <div key={key} style={{ display: 'flex', gap: '6pt', marginBottom: '3pt' }}>
                <span style={{ color: C.muted, fontSize: '8pt', width: 70, flexShrink: 0 }}>
                  {label}
                </span>
                <span style={{ fontWeight: 500 }}>{officials[key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function TeamFoulsSection({ game, side }: { game: Game; side: Side }) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const name = team.name || `Team ${side}`;
  const players = sortPlayers(team.players);
  const coach = coachStatus(game, side);
  const captain = team.captainId
    ? team.players.find(p => p.id === team.captainId)
    : null;

  return (
    <div style={{ flex: 1 }}>
      {/* Team header bar */}
      <div
        style={{
          backgroundColor: team.jerseyColour,
          color: team.numberColour,
          padding: '5pt 8pt',
          borderRadius: '4pt',
          marginBottom: '6pt',
        }}
      >
        <div style={{ fontSize: '7pt', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Team {side}
        </div>
        <div style={{ fontSize: '12pt', fontWeight: 700, lineHeight: 1.2 }}>{name}</div>
        {(team.coachName || captain) && (
          <div style={{ fontSize: '7.5pt', marginTop: '2pt', opacity: 0.85 }}>
            {team.coachName && `Coach: ${team.coachName}`}
            {team.coachName && captain && '  ·  '}
            {captain && `Capt: #${captain.number}${captain.name ? ' ' + captain.name : ''}`}
          </div>
        )}
      </div>

      {players.length === 0 ? (
        <div style={{ color: C.muted, fontStyle: 'italic', fontSize: '8.5pt' }}>
          No players recorded
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 28 }}>#</th>
              <th style={S.th}>Name</th>
              <th style={{ ...S.thRight, width: 56 }}>Fouls</th>
              <th style={{ ...S.thRight, width: 22 }}>Tot</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => {
              const stats = playerFoulStats(game, p.id);
              const breakdown = [
                stats.personal > 0 && `${stats.personal}P`,
                stats.technical > 0 && `${stats.technical}T`,
                stats.unsportsmanlike > 0 && `${stats.unsportsmanlike}U`,
                stats.disqualifying > 0 && `${stats.disqualifying}DQ`,
              ].filter(Boolean).join('·');

              return (
                <tr
                  key={p.id}
                  style={stats.ejected ? { backgroundColor: '#fef2f2' } : undefined}
                >
                  <td
                    style={{
                      ...S.td,
                      ...S.mono,
                      fontWeight: 700,
                      fontSize: '9pt',
                      color: C.black,
                    }}
                  >
                    {p.number}
                    {team.captainId === p.id && (
                      <span
                        style={{
                          fontSize: '6pt',
                          fontWeight: 700,
                          color: C.accent,
                          marginLeft: 2,
                          verticalAlign: 'super',
                        }}
                      >
                        C
                      </span>
                    )}
                  </td>
                  <td style={{ ...S.td, color: stats.ejected ? C.danger : C.body }}>
                    {p.name || <span style={{ color: C.faint }}>—</span>}
                  </td>
                  <td
                    style={{
                      ...S.tdRight,
                      ...S.mono,
                      fontSize: '8pt',
                      color: C.muted,
                    }}
                  >
                    {breakdown || '—'}
                  </td>
                  <td
                    style={{
                      ...S.tdRight,
                      ...S.mono,
                      fontWeight: 700,
                      color: stats.ejected ? C.danger : stats.total >= 4 ? C.warn : C.body,
                    }}
                  >
                    {stats.total > 0 ? stats.total : '—'}
                    {stats.ejected && (
                      <span
                        style={{
                          fontSize: '6pt',
                          marginLeft: 2,
                          verticalAlign: 'super',
                          color: C.danger,
                        }}
                      >
                        {stats.ejectedReason === 'dq' ? 'DQ' : 'OUT'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Coach / bench summary */}
      <div
        style={{
          marginTop: '6pt',
          paddingTop: '5pt',
          borderTop: `1px solid ${C.rule}`,
          fontSize: '8pt',
          color: C.muted,
          display: 'flex',
          gap: '14pt',
        }}
      >
        <span>
          Coach techs: <strong style={{ color: coach.coachTechs > 0 ? C.danger : C.body }}>
            {coach.coachTechs}
          </strong>
        </span>
        <span>
          Bench techs: <strong style={{ color: coach.benchTechs > 0 ? C.danger : C.body }}>
            {coach.benchTechs}
          </strong>
        </span>
        {coach.ejected && (
          <span style={{ color: C.danger, fontWeight: 700 }}>⬤ COACH EJECTED</span>
        )}
      </div>
    </div>
  );
}

function EventLogSection({ game }: { game: Game }) {
  const events = sortEvents(game.events);
  if (events.length === 0) return null;

  return (
    <>
      <SectionHead>Full event log</SectionHead>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, width: 70 }}>Quarter · Clock</th>
            <th style={{ ...S.th, width: 50 }}>Type</th>
            <th style={S.th}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {events.map(ev => {
            const { label, color } = eventKindLabel(ev.kind);
            return (
              <tr key={ev.id}>
                <td
                  style={{
                    ...S.td,
                    ...S.mono,
                    fontSize: '8pt',
                    color: C.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ev.quarter} · {ev.gameClock}
                </td>
                <td style={{ ...S.td, paddingLeft: 6, paddingRight: 6 }}>
                  <span
                    style={{
                      fontSize: '6.5pt',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                </td>
                <td style={{ ...S.td, color: C.body }}>{describeEvent(ev, game)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function GamePrintView({ game }: { game: Game }) {
  const totA = totalScore(game, 'A');
  const totB = totalScore(game, 'B');
  const nameA = game.teamA.name || 'Team A';
  const nameB = game.teamB.name || 'Team B';

  const statusLabel = (() => {
    const base = gameOutcomeLabel(game);
    if (game.outcome.kind === 'forfeit' || game.outcome.kind === 'default') {
      const winner = game.outcome.winner === 'A' ? nameA : nameB;
      return `${base} — winner: ${winner}`;
    }
    return base;
  })();

  const statusColor = isGameFinished(game)
    ? game.outcome.kind === 'forfeit' || game.outcome.kind === 'default'
      ? C.danger
      : C.success
    : C.warn;

  const hasOfficials =
    game.officials &&
    Object.values(game.officials).some(v => v && v.trim());

  return (
    <div style={S.root}>
      {/* ── Page 1: header + scores + officials ── */}

      {/* App + meta header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '10pt',
          paddingBottom: '8pt',
          borderBottom: `2px solid ${C.black}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '8pt',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: C.accent,
            }}
          >
            Chair Buddy
          </div>
          <div
            style={{
              fontSize: '7.5pt',
              color: C.muted,
              marginTop: '1pt',
            }}
          >
            {[game.competition, game.division].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '8pt', color: C.muted }}>
          <div>{game.date}{game.tipTime ? ` · ${game.tipTime}` : ''}</div>
          {game.venue && <div>{game.venue}</div>}
        </div>
      </div>

      {/* Teams + Score */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '12pt',
          marginBottom: '8pt',
        }}
      >
        {/* Team A */}
        <div
          style={{
            flex: 1,
            backgroundColor: game.teamA.jerseyColour,
            color: game.teamA.numberColour,
            borderRadius: '5pt',
            padding: '10pt 12pt',
          }}
        >
          <div style={{ fontSize: '7pt', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Team A
          </div>
          <div style={{ fontSize: '14pt', fontWeight: 800, lineHeight: 1.15, marginTop: '2pt' }}>
            {nameA}
          </div>
          {game.teamA.coachName && (
            <div style={{ fontSize: '7.5pt', opacity: 0.8, marginTop: '3pt' }}>
              {game.teamA.coachName}
            </div>
          )}
        </div>

        {/* Score */}
        <div
          style={{
            flexShrink: 0,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '90pt',
          }}
        >
          <div
            style={{
              fontSize: '36pt',
              fontWeight: 900,
              lineHeight: 1,
              fontFamily: 'Menlo, Consolas, "Courier New", monospace',
              fontVariantNumeric: 'tabular-nums',
              color: C.black,
              letterSpacing: '-1pt',
            }}
          >
            {totA}
            <span style={{ color: C.faint, margin: '0 4pt' }}>–</span>
            {totB}
          </div>
          <div
            style={{
              marginTop: '4pt',
              fontSize: '7.5pt',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: statusColor,
            }}
          >
            {statusLabel}
          </div>
        </div>

        {/* Team B */}
        <div
          style={{
            flex: 1,
            backgroundColor: game.teamB.jerseyColour,
            color: game.teamB.numberColour,
            borderRadius: '5pt',
            padding: '10pt 12pt',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '7pt', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Team B
          </div>
          <div style={{ fontSize: '14pt', fontWeight: 800, lineHeight: 1.15, marginTop: '2pt' }}>
            {nameB}
          </div>
          {game.teamB.coachName && (
            <div style={{ fontSize: '7.5pt', opacity: 0.8, marginTop: '3pt' }}>
              {game.teamB.coachName}
            </div>
          )}
        </div>
      </div>

      <QuarterScoresSection game={game} />

      {hasOfficials && game.officials && (
        <OfficialsSection officials={game.officials} />
      )}

      {/* ── Page 2: Fouls ── */}
      <div style={{ pageBreakBefore: 'always', paddingTop: '2pt' }}>
        <SectionHead>Player fouls</SectionHead>
        <div style={{ display: 'flex', gap: '18pt', alignItems: 'flex-start' }}>
          <TeamFoulsSection game={game} side="A" />
          <div style={{ width: '1px', backgroundColor: C.rule, alignSelf: 'stretch' }} />
          <TeamFoulsSection game={game} side="B" />
        </div>
      </div>

      {/* ── Page 3: Event log ── */}
      <div style={{ pageBreakBefore: 'always', paddingTop: '2pt' }}>
        <EventLogSection game={game} />
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '14pt',
          paddingTop: '5pt',
          borderTop: `1px solid ${C.rule}`,
          fontSize: '7pt',
          color: C.faint,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Chair Buddy — FIBA event logger</span>
        <span>Printed {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
}
