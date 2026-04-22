import type { Game, Side } from '@/types';
import {
  coachStatus,
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
  lines.push(`Date:      ${game.date}`);
  if (game.division) lines.push(`Division:  ${game.division}`);
  lines.push(`Status:    ${game.finished ? 'Final' : 'In progress'}`);
  lines.push('');
  lines.push(`${pad('Team A:', 10)}${nameA}`);
  lines.push(`${pad('Team B:', 10)}${nameB}`);
  lines.push(`${pad('Final:', 10)}${totA} - ${totB}`);
  lines.push('');
  lines.push('');

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
    { title: 'POSSESSION CHANGES', filter: 'possessionChange' }
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
