import type { Game, Officials, Side } from '@/types';
import {
  coachStatus,
  gameOutcomeLabel,
  playerFoulStats,
  quarterOrder,
  sortEvents,
  sortPlayers,
  totalScore
} from './game';
import { describeEvent } from './events';

function pad(value: string | number, width: number): string {
  const s = String(value);
  return s + ' '.repeat(Math.max(0, width - s.length));
}

function padLeft(value: string | number, width: number): string {
  const s = String(value);
  return ' '.repeat(Math.max(0, width - s.length)) + s;
}

function heading(title: string, char = '='): string {
  return `${title}\n${char.repeat(title.length)}`;
}

export function exportGameAsText(game: Game): string {
  const lines: string[] = [];
  const nameA = game.teamA.name || 'Team A';
  const nameB = game.teamB.name || 'Team B';
  const totA = totalScore(game, 'A');
  const totB = totalScore(game, 'B');

  lines.push(heading('SCORETABLE CHAIR — GAME REVIEW'));
  lines.push('');
  if (game.competition) lines.push(`${pad('Competition:', 14)}${game.competition}`);
  if (game.division) lines.push(`${pad('Division:', 14)}${game.division}`);
  lines.push(`${pad('Date:', 14)}${game.date}`);
  if (game.tipTime) lines.push(`${pad('Tip-off:', 14)}${game.tipTime}`);
  if (game.venue) lines.push(`${pad('Venue:', 14)}${game.venue}`);
  let statusLine = gameOutcomeLabel(game);
  if (
    game.outcome.kind === 'forfeit' ||
    game.outcome.kind === 'default'
  ) {
    const winner =
      game.outcome.winner === 'A' ? nameA : nameB;
    statusLine += ` — winner: ${winner}`;
  }
  lines.push(`${pad('Status:', 14)}${statusLine}`);
  lines.push('');
  lines.push(`${pad('Team A:', 14)}${nameA}`);
  if (game.teamA.coachName)
    lines.push(`${pad('  Coach:', 14)}${game.teamA.coachName}`);
  if (game.teamA.assistantCoachName)
    lines.push(`${pad('  Asst coach:', 14)}${game.teamA.assistantCoachName}`);
  if (game.teamA.captainId) {
    const cap = game.teamA.players.find(p => p.id === game.teamA.captainId);
    if (cap)
      lines.push(
        `${pad('  Captain:', 14)}#${cap.number}${cap.name ? ' ' + cap.name : ''}`
      );
  }
  lines.push(`${pad('Team B:', 14)}${nameB}`);
  if (game.teamB.coachName)
    lines.push(`${pad('  Coach:', 14)}${game.teamB.coachName}`);
  if (game.teamB.assistantCoachName)
    lines.push(`${pad('  Asst coach:', 14)}${game.teamB.assistantCoachName}`);
  if (game.teamB.captainId) {
    const cap = game.teamB.players.find(p => p.id === game.teamB.captainId);
    if (cap)
      lines.push(
        `${pad('  Captain:', 14)}#${cap.number}${cap.name ? ' ' + cap.name : ''}`
      );
  }
  lines.push(`${pad('Final score:', 14)}${totA} - ${totB}`);
  lines.push('');

  if (game.officials && Object.values(game.officials).some(v => v && v.trim())) {
    lines.push(heading('OFFICIALS'));
    lines.push('');
    const o = game.officials;
    const rows: Array<[string, keyof Officials]> = [
      ['Crew chief', 'crewChief'],
      ['Umpire 1', 'umpire1'],
      ['Umpire 2', 'umpire2'],
      ['Commissioner', 'commissioner'],
      ['Scorer', 'scorer'],
      ['Asst scorer', 'assistantScorer'],
      ['Timer', 'timer'],
      ['Shot-clock op.', 'shotClockOperator']
    ];
    for (const [label, key] of rows) {
      const v = o[key];
      if (v && v.trim()) {
        lines.push(`  ${pad(label + ':', 18)}${v}`);
      }
    }
    lines.push('');
    lines.push('');
  }

  lines.push(heading('QUARTER SCORES'));
  lines.push('');
  const sortedQuarters = [...game.quarterScores].sort(
    (a, b) => quarterOrder(a.quarter) - quarterOrder(b.quarter)
  );
  const qColW = 8;
  const scoreColW = Math.max(nameA.length, nameB.length, 6) + 2;
  lines.push(
    `  ${pad('Quarter', qColW)}${pad(nameA, scoreColW)}${pad(nameB, scoreColW)}`
  );
  lines.push(`  ${'-'.repeat(qColW)}${'-'.repeat(scoreColW)}${'-'.repeat(scoreColW)}`);
  if (sortedQuarters.length === 0) {
    lines.push(`  (no quarter scores recorded)`);
  } else {
    for (const qs of sortedQuarters) {
      lines.push(
        `  ${pad(qs.quarter, qColW)}${pad(qs.teamAScore, scoreColW)}${pad(qs.teamBScore, scoreColW)}`
      );
    }
  }
  lines.push(`  ${'-'.repeat(qColW)}${'-'.repeat(scoreColW)}${'-'.repeat(scoreColW)}`);
  lines.push(
    `  ${pad('Total', qColW)}${pad(totA, scoreColW)}${pad(totB, scoreColW)}`
  );
  lines.push('');
  lines.push('');

  for (const side of ['A', 'B'] as Side[]) {
    const team = side === 'A' ? game.teamA : game.teamB;
    const heading_ = `${(team.name || `Team ${side}`).toUpperCase()} — PLAYER FOULS`;
    lines.push(heading(heading_));
    lines.push('');
    if (team.players.length === 0) {
      lines.push('  (no players)');
    } else {
      for (const p of sortPlayers(team.players)) {
        const stats = playerFoulStats(game, p.id);
        const tag = `#${p.number}${p.name ? ' ' + p.name : ''}`;
        const breakdown = [
          stats.personal > 0 && `${stats.personal}P`,
          stats.technical > 0 && `${stats.technical}T`,
          stats.unsportsmanlike > 0 && `${stats.unsportsmanlike}U`,
          stats.disqualifying > 0 && `${stats.disqualifying}DQ`
        ]
          .filter(Boolean)
          .join(' ');
        const status = stats.ejected
          ? ` [${stats.ejectedReason === 'dq' ? 'DQ' : 'OUT'}]`
          : '';
        lines.push(
          `  ${pad(tag, 26)}${padLeft(stats.total + 'F', 5)}  ${pad(breakdown, 14)}${status}`
        );
      }
    }
    const coach = coachStatus(game, side);
    lines.push('');
    lines.push(`  Coach techs:  ${coach.coachTechs}`);
    lines.push(`  Bench techs:  ${coach.benchTechs}`);
    lines.push(
      `  Coach:        ${coach.ejected ? 'EJECTED' : 'ok'}`
    );
    lines.push('');
    lines.push('');
  }

  const sorted = sortEvents(game.events);

  const logKinds: Array<{
    title: string;
    filter: (typeof sorted)[number]['kind'];
  }> = [
    { title: 'WARNINGS', filter: 'warning' },
    { title: 'TIMEOUTS', filter: 'timeout' },
    { title: 'POSSESSION CHANGES', filter: 'possessionChange' },
    { title: 'PROTESTS', filter: 'protest' }
  ];

  for (const { title, filter } of logKinds) {
    lines.push(heading(title));
    lines.push('');
    const items = sorted.filter(e => e.kind === filter);
    if (items.length === 0) {
      lines.push('  (none)');
    } else {
      for (const e of items) {
        lines.push(
          `  ${pad(e.quarter, 5)} · ${e.gameClock}  ${describeEvent(e, game)}`
        );
      }
    }
    lines.push('');
    lines.push('');
  }

  lines.push(heading('FULL EVENT LOG'));
  lines.push('');
  if (sorted.length === 0) {
    lines.push('  (no events)');
  } else {
    for (const e of sorted) {
      lines.push(
        `  ${pad(e.quarter, 5)} · ${e.gameClock}  ${describeEvent(e, game)}`
      );
    }
  }
  lines.push('');
  lines.push('');

  lines.push(`Exported ${new Date().toISOString()}`);

  return lines.join('\n');
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
