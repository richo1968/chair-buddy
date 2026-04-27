import type { BenchLayout, Game, GameEvent, Quarter, Side, Team } from '@/types';
import { DEFAULT_CLOCK } from '@/components/GameClockInput';
import { contrastText } from '@/lib/colours';

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function blankTeam(jerseyColour: string): Team {
  return {
    name: '',
    jerseyColour,
    numberColour: contrastText(jerseyColour),
    players: []
  };
}

export function newGame(opts: {
  date: string;
  division: string;
  teamA: Team;
  teamB: Team;
  layout?: BenchLayout;
}): Game {
  const now = Date.now();
  return {
    id: newId(),
    date: opts.date,
    division: opts.division,
    teamA: opts.teamA,
    teamB: opts.teamB,
    currentQuarter: 'Q1',
    possessionArrow: null,
    arrowDirection: null,
    layout: opts.layout ?? 'A-left',
    outcome: { kind: 'live' },
    finished: false,
    lastGameClock: DEFAULT_CLOCK,
    events: [],
    quarterScores: [],
    createdAt: now,
    updatedAt: now
  };
}

export function isGameFinished(game: Game): boolean {
  return game.outcome.kind !== 'live';
}

export function gameOutcomeLabel(game: Game): string {
  switch (game.outcome.kind) {
    case 'live':
      return 'Live';
    case 'final':
      return 'Final';
    case 'forfeit':
      return 'Forfeit';
    case 'default':
      return 'Default';
  }
}

const QUARTER_ORDER: Record<string, number> = {
  Q1: 1,
  Q2: 2,
  Q3: 3,
  Q4: 4
};

export function quarterOrder(q: Quarter): number {
  if (q in QUARTER_ORDER) return QUARTER_ORDER[q];
  if (q.startsWith('OT')) return 4 + Number(q.slice(2));
  return 999;
}

export function nextQuarter(q: Quarter): Quarter {
  if (q === 'Q1') return 'Q2';
  if (q === 'Q2') return 'Q3';
  if (q === 'Q3') return 'Q4';
  if (q === 'Q4') return 'OT1';
  if (q.startsWith('OT')) {
    const n = Number(q.slice(2));
    return `OT${n + 1}` as Quarter;
  }
  return q;
}

export function quarterFromOrder(n: number): Quarter {
  if (n === 1) return 'Q1';
  if (n === 2) return 'Q2';
  if (n === 3) return 'Q3';
  if (n === 4) return 'Q4';
  return `OT${n - 4}` as Quarter;
}

/** Quarters strictly before `current`, in chronological order. Q1 returns []. */
export function previousQuarters(current: Quarter): Quarter[] {
  const max = quarterOrder(current);
  const out: Quarter[] = [];
  for (let n = 1; n < max; n++) out.push(quarterFromOrder(n));
  return out;
}

export function clockToSeconds(clock: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(clock);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function sortEvents(events: readonly GameEvent[]): GameEvent[] {
  return [...events].sort((a, b) => {
    const qa = quarterOrder(a.quarter);
    const qb = quarterOrder(b.quarter);
    if (qa !== qb) return qa - qb;
    const sa = clockToSeconds(a.gameClock);
    const sb = clockToSeconds(b.gameClock);
    if (sa !== sb) return sb - sa;
    return b.wallTimestamp - a.wallTimestamp;
  });
}

export function sortEventsNewestFirst(events: readonly GameEvent[]): GameEvent[] {
  return [...events].sort((a, b) => {
    const qa = quarterOrder(a.quarter);
    const qb = quarterOrder(b.quarter);
    if (qa !== qb) return qb - qa;
    const sa = clockToSeconds(a.gameClock);
    const sb = clockToSeconds(b.gameClock);
    if (sa !== sb) return sa - sb;
    return b.wallTimestamp - a.wallTimestamp;
  });
}

export function eventBelongsToTeam(event: GameEvent, side: Side): boolean {
  switch (event.kind) {
    case 'foul':
      return event.team === side;
    case 'warning':
      return (event.target === 'teamA' ? 'A' : 'B') === side;
    case 'possessionChange':
      return event.newTeam === side;
    case 'timeout':
      return event.team === side;
    case 'protest':
      return event.team === side;
    case 'quarterScoreRecorded':
      return true;
  }
}

export function totalScore(game: Game, side: Side): number {
  return game.quarterScores.reduce(
    (acc, qs) => acc + (side === 'A' ? qs.teamAScore : qs.teamBScore),
    0
  );
}

export function compareJerseyNumbers(a: string, b: string): number {
  const aT = a.trim();
  const bT = b.trim();
  if (aT === bT) return 0;
  // FIBA convention: "00" sits before "0", before 1, 2, ...
  if (aT === '00') return -1;
  if (bT === '00') return 1;
  const aN = parseInt(aT, 10);
  const bN = parseInt(bT, 10);
  if (isNaN(aN) && isNaN(bN)) return aT.localeCompare(bT);
  if (isNaN(aN)) return 1;
  if (isNaN(bN)) return -1;
  if (aN !== bN) return aN - bN;
  return aT.localeCompare(bT);
}

export function sortPlayers<T extends { number: string }>(
  players: readonly T[]
): T[] {
  return [...players].sort((a, b) => compareJerseyNumbers(a.number, b.number));
}

export function foulsForPlayer(game: Game, playerId: string): number {
  return game.events.filter(
    e =>
      e.kind === 'foul' &&
      e.on.kind === 'player' &&
      e.on.playerId === playerId
  ).length;
}

export interface PlayerFoulStats {
  total: number;
  personal: number;
  technical: number;
  unsportsmanlike: number;
  disqualifying: number;
  tu: number;
  ejected: boolean;
  ejectedReason: 'five' | 'tu' | 'dq' | null;
  fourFoulWarning: boolean;
  tuWarning: boolean;
}

export function playerFoulStats(
  game: Game,
  playerId: string
): PlayerFoulStats {
  let personal = 0;
  let technical = 0;
  let unsportsmanlike = 0;
  let disqualifying = 0;
  for (const e of game.events) {
    if (e.kind !== 'foul') continue;
    if (e.on.kind !== 'player') continue;
    if (e.on.playerId !== playerId) continue;
    if (e.type === 'personal') personal++;
    else if (e.type === 'technical') technical++;
    else if (e.type === 'unsportsmanlike') unsportsmanlike++;
    else if (e.type === 'disqualifying') disqualifying++;
  }
  const total = personal + technical + unsportsmanlike + disqualifying;
  const tu = technical + unsportsmanlike;
  let ejectedReason: PlayerFoulStats['ejectedReason'] = null;
  if (disqualifying >= 1) ejectedReason = 'dq';
  else if (tu >= 2) ejectedReason = 'tu';
  else if (total >= 5) ejectedReason = 'five';
  const ejected = ejectedReason !== null;
  return {
    total,
    personal,
    technical,
    unsportsmanlike,
    disqualifying,
    tu,
    ejected,
    ejectedReason,
    fourFoulWarning: !ejected && total === 4,
    tuWarning: !ejected && tu === 1
  };
}

export function teamFoulsForQuarter(
  game: Game,
  side: Side,
  quarter: Quarter
): number {
  return game.events.filter(
    e =>
      e.kind === 'foul' &&
      e.team === side &&
      e.quarter === quarter &&
      e.on.kind === 'player'
  ).length;
}

export function coachTechs(game: Game, side: Side): number {
  return game.events.filter(
    e => e.kind === 'foul' && e.team === side && e.on.kind === 'coach'
  ).length;
}

export function benchTechs(game: Game, side: Side): number {
  return game.events.filter(
    e => e.kind === 'foul' && e.team === side && e.on.kind === 'bench'
  ).length;
}

export interface CoachStatus {
  coachTechs: number;
  benchTechs: number;
  ejected: boolean;
}

export function coachStatus(game: Game, side: Side): CoachStatus {
  const c = coachTechs(game, side);
  const b = benchTechs(game, side);
  return {
    coachTechs: c,
    benchTechs: b,
    ejected: c >= 2 || c + b >= 3
  };
}

export interface TimeoutStatus {
  used: number;
  max: number;
  remaining: number;
  phaseLabel: string;
}

export function timeoutStatus(
  game: Game,
  side: Side,
  quarterOverride?: Quarter
): TimeoutStatus {
  const q = quarterOverride ?? game.currentQuarter;
  let phaseLabel: string;
  let max: number;
  let used = 0;
  if (q === 'Q1' || q === 'Q2') {
    phaseLabel = '1st half';
    max = 2;
    for (const e of game.events) {
      if (
        e.kind === 'timeout' &&
        e.team === side &&
        (e.quarter === 'Q1' || e.quarter === 'Q2')
      )
        used++;
    }
  } else if (q === 'Q3' || q === 'Q4') {
    phaseLabel = '2nd half';
    max = 3;
    for (const e of game.events) {
      if (
        e.kind === 'timeout' &&
        e.team === side &&
        (e.quarter === 'Q3' || e.quarter === 'Q4')
      )
        used++;
    }
  } else {
    phaseLabel = q;
    max = 1;
    for (const e of game.events) {
      if (e.kind === 'timeout' && e.team === side && e.quarter === q) used++;
    }
  }
  return {
    used,
    max,
    remaining: Math.max(0, max - used),
    phaseLabel
  };
}
