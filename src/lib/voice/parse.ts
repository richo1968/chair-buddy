import type {
  ArrowDirection,
  FoulType,
  Game,
  PossessionReason,
  Side,
  WarningType
} from '@/types';
import { DEFAULT_CLOCK, isValidGameClock } from '@/components/GameClockInput';
import { FOUL_TYPE_LABEL, POSSESSION_REASON_SHORT, WARNING_TYPE_LABEL } from '@/lib/events';

/** One thing a spoken phrase asks Chair Buddy to do, awaiting confirmation. */
export type VoiceAction =
  | {
      kind: 'foul';
      side: Side;
      /** Player number; undefined for coach/bench fouls. */
      number?: string;
      subject: 'player' | 'coach' | 'bench';
      type: FoulType;
      freeThrows?: number;
      clock: string;
      /** Team wasn't clear: this is one of two choices the chair picks between. */
      alternative?: boolean;
    }
  | { kind: 'score'; side: Side; number?: string; points: 1 | 2 | 3; clock: string; alternative?: boolean }
  | { kind: 'timeout'; side: Side; clock: string }
  | { kind: 'warning'; side: Side; warningType: WarningType; clock: string }
  | {
      kind: 'possession';
      side: Side;
      direction: ArrowDirection;
      reason: PossessionReason;
      clock: string;
      initial: boolean;
    }
  | { kind: 'quarterScore'; a: number; b: number; flipArrow: boolean }
  | { kind: 'protest'; side: Side; reason: string; clock: string };

export interface ParseResult {
  actions: VoiceAction[];
  /** Phrases that looked like commands but couldn't be completed. */
  problems: string[];
}

// ---------------------------------------------------------------- numbers

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, nil: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90
};
/**
 * Basketball words speech recognition commonly mishears. At a scoretable,
 * "number 1 fell at 3 minutes" means a foul.
 */
const SOUND_ALIKES: Record<string, string> = {
  fell: 'foul', fall: 'foul', falls: 'foul', fallen: 'foul', full: 'foul', fool: 'foul',
  fools: 'foul', fowl: 'foul', foal: 'foul', fail: 'foul', file: 'foul', fuel: 'foul',
  fault: 'foul', faults: 'foul', fouled: 'foul', fouling: 'foul', foll: 'foul', fol: 'foul',
  howl: 'foul', foley: 'foul', thou: 'foul', vowel: 'foul', towel: 'foul', fowls: 'foul',
  timeouts: 'timeout', timer: 'timeout',
  morning: 'warning', warming: 'warning', warn: 'warning', warned: 'warning',
  arrows: 'arrow', aero: 'arrow', error: 'arrow', errol: 'arrow', harrow: 'arrow', narrow: 'arrow',
  tech: 'technical', techs: 'technical', technicals: 'technical', tea: 'technical',
  unsporting: 'unsportsmanlike', unsportsman: 'unsportsmanlike', unsportsmen: 'unsportsmanlike',
  pointers: 'pointer', pts: 'points', pints: 'points', paints: 'points', joints: 'points',
  numbers: 'number', num: 'number'
};

/** Words speech recognition writes for a number when it mishears one. */
const HOMOPHONES: Record<string, string> = {
  to: '2', too: '2', won: '1', for: '4', fore: '4', ate: '8', tree: '3', free: '3'
};

function wordsToDigits(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t in TENS) {
      const next = tokens[i + 1];
      if (next && next in UNITS && UNITS[next] > 0 && UNITS[next] < 10) {
        out.push(String(TENS[t] + UNITS[next]));
        i++;
      } else {
        out.push(String(TENS[t]));
      }
    } else if (t in UNITS) {
      out.push(String(UNITS[t]));
    } else if (t === 'double' && /^\d$/.test(tokens[i + 1] ?? '')) {
      // "double zero" → 00
      out.push(tokens[i + 1] + tokens[i + 1]);
      i++;
    } else {
      out.push(t);
    }
  }
  return out;
}

export function normalise(text: string): string {
  let s = text.toLowerCase();
  s = s.replace(/(\d)\s*:\s*(\d)/g, '$1:$2');
  s = s.replace(/[^a-z0-9:#\s]/g, ' ');
  s = s.replace(/#\s*/g, 'number ');
  s = s.replace(/\b(?:time|tie|type|tired|times?)\s+(?:out|outs|now)\b/g, 'timeout');
  s = s.replace(/\bfree\s+(?:through|thru|threw|row)\b/g, 'free throw');
  s = s.replace(/\b(?:jump|jumped)\s+(?:bowl|bull|bald|call|all)\b/g, 'jump ball');
  s = s.replace(/\bheld\s+(?:bowl|bull|bald|all)\b/g, 'held ball');
  s = s.replace(/\bno\.\s*/g, 'number ');
  let tokens = s.split(/\s+/).filter(Boolean);
  tokens = tokens.map(t => SOUND_ALIKES[t] ?? t);
  tokens = wordsToDigits(tokens);
  // "number for" / "number to" → digits
  tokens = tokens.map((t, i) =>
    (tokens[i - 1] === 'number' || tokens[i - 1] === 'numbers') && t in HOMOPHONES
      ? HOMOPHONES[t]
      : t
  );
  let out = tokens.join(' ');
  // Scoresheet shorthand: "P2" = personal foul, 2 shots; "T1", "U2", "D2" likewise.
  out = out.replace(/\b(?:(p|pee|pea)|(t|tee)|(u)|(d|dee))\s?([123])\b(?! (?:points?|pointer|minutes?|seconds?))/g,
    (_m, p, t, u, _d, n) =>
      `${p ? 'personal' : t ? 'technical' : u ? 'unsportsmanlike' : 'disqualifying'} foul ${n} shots`);
  return out;
}

// ---------------------------------------------------------------- teams

const NAMED_COLOURS: [string, [number, number, number]][] = [
  ['white', [255, 255, 255]],
  ['black', [20, 20, 24]],
  ['red', [220, 38, 38]],
  ['maroon', [128, 0, 32]],
  ['orange', [249, 115, 22]],
  ['yellow', [250, 204, 21]],
  ['gold', [212, 175, 55]],
  ['green', [34, 197, 94]],
  ['teal', [20, 184, 166]],
  ['blue', [59, 130, 246]],
  ['navy', [30, 58, 138]],
  ['purple', [139, 92, 246]],
  ['pink', [236, 72, 153]],
  ['grey', [107, 114, 128]]
];

// Includes what speech recognition actually wrote at a game: "what 21 point",
// "wife 15", "read 24", "grade 23".
const COLOUR_ALIASES: Record<string, string[]> = {
  white: ['what', 'why', 'wife', 'wipe', 'watch', 'wide', 'quite', 'wait', 'while', 'whites', 'wight', 'wine', 'wise', 'whyte'],
  red: ['read', 'grade', 'rid', 'bread', 'reds', 'ride', 'ready', 'rad', 'rate'],
  black: ['block', 'blacks', 'blank', 'plaque', 'black s', 'lack'],
  grey: ['gray', 'silver'],
  green: ['queen', 'grain', 'greens'],
  navy: ['dark blue', 'navy blue'],
  blue: ['light blue', 'sky blue', 'royal'],
  maroon: ['burgundy'],
  gold: ['yellow'],
  yellow: ['gold']
};

export function colourName(hex: string): string | null {
  const c = hex.replace('#', '');
  if (c.length !== 6) return null;
  const rgb = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16));
  let best: string | null = null;
  let bestD = Infinity;
  for (const [name, ref] of NAMED_COLOURS) {
    const d = ref.reduce((s, v, i) => s + (v - rgb[i]) ** 2, 0);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

const STOP_WORDS = new Set([
  'the', 'and', 'of', 'club', 'basketball', 'team', 'bball', 'inc', 'fc', 'bc',
  'u10', 'u12', 'u14', 'u16', 'u18', 'u20', 'boys', 'girls', 'men', 'women',
  'mens', 'womens', 'a', 'b', 'div', 'division'
]);

/** Phrases that refer to each side: jersey colour, words of the team name, "team a". */
export function teamKeywords(game: Game): Record<Side, string[]> {
  const out: Record<Side, string[]> = { A: ['team a'], B: ['team b'] };
  const colourA = colourName(game.teamA.jerseyColour);
  const colourB = colourName(game.teamB.jerseyColour);
  if (colourA && colourA !== colourB) out.A.push(colourA, ...(COLOUR_ALIASES[colourA] ?? []));
  if (colourB && colourB !== colourA) out.B.push(colourB, ...(COLOUR_ALIASES[colourB] ?? []));
  const nameWords = (side: Side) =>
    normalise((side === 'A' ? game.teamA : game.teamB).name)
      .split(' ')
      .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
  const wa = nameWords('A');
  const wb = nameWords('B');
  out.A.push(...wa.filter(w => !wb.includes(w)));
  out.B.push(...wb.filter(w => !wa.includes(w)));
  if (game.teamA.name) out.A.push(normalise(game.teamA.name));
  if (game.teamB.name) out.B.push(normalise(game.teamB.name));
  // An alias that's the other side's colour would be ambiguous.
  out.A = out.A.filter(k => !out.B.includes(k));
  out.B = out.B.filter(k => !out.A.includes(k));
  return out;
}

/** Words to bias the speech recogniser towards. */
export function recognitionHints(game: Game): string[] {
  const kw = teamKeywords(game);
  return [
    ...kw.A,
    ...kw.B,
    'foul', 'personal foul', 'technical foul', 'unsportsmanlike foul',
    'disqualifying foul', 'double foul', 'coach technical', 'bench technical',
    'timeout', 'arrow', 'possession', 'jump ball', 'held ball', 'warning',
    'time delay warning', 'flop warning', 'end of quarter', 'score', 'protest',
    'free throws', 'two shots', 'three shots', '2 points', '3 points', 'free throw'
  ];
}

interface Mention {
  side: Side;
  start: number;
  end: number;
}

function findMentions(clause: string, kw: Record<Side, string[]>): Mention[] {
  const found: Mention[] = [];
  for (const side of ['A', 'B'] as const) {
    for (const k of kw[side]) {
      const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(clause))) {
        found.push({ side, start: m.index, end: m.index + k.length });
      }
    }
  }
  // Drop mentions nested inside a longer one ("blue" within "navy blue").
  return found
    .filter(m => !found.some(o => o !== m && o.start <= m.start && o.end >= m.end && o.end - o.start > m.end - m.start))
    .sort((x, y) => x.start - y.start);
}

// ---------------------------------------------------------------- clock

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Pulls a game-clock time out of the clause; returns it and the clause without it. */
export function extractClock(clause: string): { clock: string | null; rest: string } {
  const patterns: [RegExp, (m: RegExpExecArray) => string][] = [
    [/\b(\d{1,2}) minutes? (?:and )?(\d{1,2}) (?:seconds?|secs?)\b/, m => `${pad(+m[1])}:${pad(+m[2])}`],
    [/\b(\d{1,2}) minutes? (?:and )?(\d{1,2})\b/, m => `${pad(+m[1])}:${pad(+m[2])}`],
    [/\b(\d{1,2}):(\d{2})\b/, m => `${pad(+m[1])}:${m[2]}`],
    [/\b(?:at|with|clock) (\d{1,2}) (\d{2})\b/, m => `${pad(+m[1])}:${m[2]}`],
    [/\b(?:at|with|clock) (\d)(\d{2})\b/, m => `${pad(+m[1])}:${m[2]}`],
    [/\b(?:at|with|clock) (\d{1,2})(\d{2})\b/, m => `${pad(+m[1])}:${m[2]}`],
    [/\b(\d{1,2}) (?:seconds?|secs?)(?: left| to go)?\b/, m => `00:${pad(+m[1])}`],
    [/\b(\d{1,2}) minutes?(?: left| to go)?\b/, m => `${pad(+m[1])}:00`]
  ];
  for (const [re, fmt] of patterns) {
    const m = re.exec(clause);
    if (m) {
      const clock = fmt(m);
      if (isValidGameClock(clock)) {
        return { clock, rest: clause.slice(0, m.index) + ' ' + clause.slice(m.index + m[0].length) };
      }
    }
  }
  return { clock: null, rest: clause };
}

export function extractFreeThrows(clause: string): { fts?: number; rest: string } {
  const m = /\b(\d) (?:shots?|free throws?|fts?|foul shots?)\b/.exec(clause);
  if (m) return { fts: +m[1], rest: clause.replace(m[0], ' ') };
  if (/\band (?:1|one)\b/.test(clause)) return { fts: 1, rest: clause.replace(/\band (?:1|one)\b/, ' ') };
  return { rest: clause };
}

// ---------------------------------------------------------------- clauses

const POINTS_RE = /\b([123]) (?:points?|pointer|pointers|pts?)\b|\bfree throw(?: made| good| in| scored)?\b|\blay ?up\b|\bbucket\b/;

const COMMAND_RE =
  /\b(points?|pointer|free throw|foul|fouls|technical|tech|unsportsmanlike|unsporting|disqualifying|disqualified|timeout|warning|arrow|possession|jump ball|held ball|lodged|score|scores|quarter|half time|halftime|protest)\b/;

/**
 * "white 21 point" is really "white 2, 1 point": recognition glues the jersey
 * number and the points value together. Split the last digit off a number
 * that sits right before "point(s)" when no separate 1–3 value was said.
 */
function unglueNumberPoints(text: string): string {
  return text.replace(/\b(\d{1,2})([123]) (points?|pointer)\b/g, (m, num, pts, word, offset, all) => {
    const before = all.slice(Math.max(0, offset - 12), offset);
    if (/\b[123] $/.test(before)) return m;
    return `${num} ${pts} ${word}`;
  });
}

function splitClauses(text: string): string[] {
  const raw = text
    .split(/\b(?:and then|then|also|next)\b|[,.;]|\band\b(?= (?:a |an |the )?(?:[123] points?|free throw|foul|technical|timeout|warning|arrow|possession|jump|held|score|protest|double|personal|unsportsmanlike|coach|bench)\b)/)
    .map(s => s.trim())
    .filter(Boolean);
  // A fragment with no command word belongs to the previous command
  // ("double foul white 4" + "black 7").
  const merged: string[] = [];
  for (const c of raw) {
    if (merged.length && !COMMAND_RE.test(c)) merged[merged.length - 1] += ' ' + c;
    else merged.push(c);
  }
  return merged;
}

function foulTypeOf(c: string): FoulType {
  if (/\b(unsportsmanlike|unsporting|u foul)\b/.test(c)) return 'unsportsmanlike';
  if (/\b(disqualifying|disqualified|dq)\b/.test(c)) return 'disqualifying';
  if (/\b(technical|tech)\b/.test(c)) return 'technical';
  return 'personal';
}

/** Numbers in the clause, each attributed to the team mentioned nearest before it. */
function numbersByTeam(clause: string, mentions: Mention[]): { side: Side | null; number: string }[] {
  const out: { side: Side | null; number: string }[] = [];
  const re = /\b(\d{1,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clause))) {
    if (mentions.some(x => m!.index >= x.start && m!.index < x.end)) continue;
    const before = mentions.filter(x => x.end <= m!.index).pop();
    const after = mentions.find(x => x.start > m!.index);
    out.push({ side: before?.side ?? after?.side ?? null, number: String(+m[1]) });
  }
  return out;
}

function onRoster(game: Game, side: Side, number: string) {
  const team = side === 'A' ? game.teamA : game.teamB;
  return team.players.some(p => String(+p.number) === number || p.number === number);
}

export function parseCommand(text: string, game: Game): ParseResult {
  const actions: VoiceAction[] = [];
  const problems: string[] = [];
  const kw = teamKeywords(game);
  const lastClock = game.lastGameClock || DEFAULT_CLOCK;
  const leftSide: Side = game.layout === 'A-left' ? 'A' : 'B';

  for (const original of splitClauses(unglueNumberPoints(normalise(text)))) {
    const { clock: spokenClock, rest: noClock } = extractClock(original);
    const clock = spokenClock ?? lastClock;
    const mentions = findMentions(noClock, kw);
    const sides = [...new Set(mentions.map(m => m.side))];
    const firstSide = mentions[0]?.side ?? null;
    const c = noClock;

    if (/\bprotest\b/.test(c)) {
      if (!firstSide) {
        problems.push(`Protest — which team? ("${original}")`);
        continue;
      }
      const reason = c.replace(/\b(protest|lodged|by|from|for)\b/g, ' ')
        .replace(new RegExp(`\\b(${kw[firstSide].join('|')})\\b`, 'g'), ' ')
        .replace(/\s+/g, ' ').trim();
      actions.push({ kind: 'protest', side: firstSide, reason, clock });
      continue;
    }

    if (POINTS_RE.test(c) && !/\b(foul|fouls|technical|unsportsmanlike|disqualifying)\b/.test(c)) {
      // "2 points white 6 and 3 points black 7" — one action per segment.
      for (const seg of c.split(/\band\b/)) {
        const pm = POINTS_RE.exec(seg);
        if (!pm) continue;
        const points = (pm[1] ? +pm[1] : /lay ?up|bucket/.test(pm[0]) ? 2 : 1) as 1 | 2 | 3;
        const rest = seg.replace(pm[0], ' ');
        const segMentions = findMentions(rest, kw);
        const nums = numbersByTeam(rest, segMentions);
        let side: Side | null = segMentions[0]?.side ?? null;
        const number = nums[0]?.number;
        if (!side && number) {
          const inA = onRoster(game, 'A', number);
          const inB = onRoster(game, 'B', number);
          side = inA && !inB ? 'A' : inB && !inA ? 'B' : null;
        }
        if (!side) {
          for (const alt of ['A', 'B'] as const) {
            actions.push({ kind: 'score', side: alt, number, points, clock, alternative: true });
          }
          continue;
        }
        actions.push({ kind: 'score', side, number, points, clock });
      }
      continue;
    }

    if (/\btimeout\b/.test(c)) {
      if (!firstSide) {
        problems.push(`Timeout — which team? ("${original}")`);
        continue;
      }
      actions.push({ kind: 'timeout', side: firstSide, clock });
      continue;
    }

    if (/\bwarning\b/.test(c)) {
      const warningType: WarningType = /\b(time delay|delay|delay of game)\b/.test(c)
        ? 'time-delay'
        : /\bflop/.test(c)
          ? 'flop'
          : 'general';
      if (!firstSide) {
        problems.push(`Warning — which team? ("${original}")`);
        continue;
      }
      actions.push({ kind: 'warning', side: firstSide, warningType, clock });
      continue;
    }

    if (/\b(foul|fouls|technical|tech|unsportsmanlike|unsporting|disqualifying|disqualified)\b/.test(c)) {
      const type = foulTypeOf(c);
      const { fts, rest } = extractFreeThrows(c);
      const restMentions = findMentions(rest, kw);
      if (/\bcoach\b/.test(rest) || /\bbench\b/.test(rest)) {
        const side = restMentions[0]?.side;
        if (!side) {
          problems.push(`Which team's ${/\bcoach\b/.test(rest) ? 'coach' : 'bench'}? ("${original}")`);
          continue;
        }
        actions.push({
          kind: 'foul',
          side,
          subject: /\bcoach\b/.test(rest) ? 'coach' : 'bench',
          type: type === 'personal' ? 'technical' : type,
          freeThrows: fts,
          clock
        });
        continue;
      }
      const nums = numbersByTeam(rest, restMentions);
      if (nums.length === 0) {
        problems.push(`Foul — which player number? ("${original}")`);
        continue;
      }
      const isDouble = /\bdouble\b/.test(rest);
      nums.forEach((n, i) => {
        let side = n.side;
        if (!side) {
          const inA = onRoster(game, 'A', n.number);
          const inB = onRoster(game, 'B', n.number);
          side = inA && !inB ? 'A' : inB && !inA ? 'B' : null;
        }
        if (!side && isDouble && i === 1 && actions.length) {
          const prev = actions[actions.length - 1];
          if (prev.kind === 'foul') side = prev.side === 'A' ? 'B' : 'A';
        }
        if (!side) {
          for (const alt of ['A', 'B'] as const) {
            actions.push({ kind: 'foul', side: alt, subject: 'player', number: n.number, type, freeThrows: fts, clock, alternative: true });
          }
          return;
        }
        actions.push({
          kind: 'foul',
          side,
          subject: 'player',
          number: n.number,
          type,
          freeThrows: isDouble ? undefined : fts,
          clock
        });
      });
      continue;
    }

    if (/\b(arrow|possession|jump ball|held ball|lodged)\b/.test(c)) {
      const initial = game.possessionArrow === null;
      const said: ArrowDirection | null = /\bleft\b/.test(c) ? 'left' : /\bright\b/.test(c) ? 'right' : null;
      const reason: PossessionReason = /\b(lodged|stuck)\b/.test(c)
        ? 'lodged-ball'
        : /\b(start of|quarter start|period|throw in)\b/.test(c)
          ? 'quarter-start'
          : /\b(out of bounds|uncertain|uncertainty|officials)\b/.test(c)
            ? 'officials-uncertainty'
            : 'held-ball';
      const side: Side | null = firstSide ?? (initial ? null : game.possessionArrow === 'A' ? 'B' : 'A');
      if (!side) {
        problems.push(`Arrow — which team? ("${original}")`);
        continue;
      }
      let direction: ArrowDirection | null = said;
      if (!direction && !initial) {
        const flipped: ArrowDirection = game.arrowDirection === 'left' ? 'right' : 'left';
        direction = side === game.possessionArrow ? game.arrowDirection : flipped;
      }
      if (!direction) {
        problems.push(`Arrow — say "left" or "right" for the first arrow ("${original}")`);
        continue;
      }
      actions.push({
        kind: 'possession',
        side,
        direction,
        reason,
        clock: reason === 'quarter-start' && !spokenClock ? DEFAULT_CLOCK : clock,
        initial
      });
      continue;
    }

    if (/\b(score|scores|quarter|half time|halftime)\b/.test(c)) {
      const nums = numbersByTeam(c, mentions).filter(n => +n.number <= 250);
      // Bare "score 23 18" reads in screen order, left team first.
      let a: number | null = null;
      let b: number | null = null;
      if (sides.length === 2 && nums.every(n => n.side)) {
        a = Number(nums.find(n => n.side === 'A')?.number);
        b = Number(nums.find(n => n.side === 'B')?.number);
      } else if (nums.length >= 2) {
        const [first, second] = [+nums[0].number, +nums[1].number];
        const firstSideForNum = nums[0].side ?? leftSide;
        a = firstSideForNum === 'A' ? first : second;
        b = firstSideForNum === 'A' ? second : first;
      }
      if (a === null || b === null || isNaN(a) || isNaN(b)) {
        problems.push(`Score — I need both teams' scores ("${original}")`);
        continue;
      }
      actions.push({
        kind: 'quarterScore',
        a,
        b,
        flipArrow: game.currentQuarter === 'Q2'
      });
      continue;
    }

    // No action word, but a player was named ("white 4 at 3 minutes") — at
    // the scoretable that's almost always a foul. The chair confirms it.
    const guess = numbersByTeam(c, mentions);
    if (guess.length && (mentions.length || /\bnumber\b/.test(c))) {
      for (const n of guess) {
        let side = n.side;
        if (!side) {
          const inA = onRoster(game, 'A', n.number);
          const inB = onRoster(game, 'B', n.number);
          side = inA && !inB ? 'A' : inB && !inA ? 'B' : null;
        }
        if (!side) {
          for (const alt of ['A', 'B'] as const) {
            actions.push({ kind: 'foul', side: alt, subject: 'player', number: n.number, type: 'personal', clock, alternative: true });
          }
          continue;
        }
        actions.push({ kind: 'foul', side, subject: 'player', number: n.number, type: 'personal', clock });
      }
    }
  }
  // "white three or three" — the same action heard twice in one phrase.
  const seen = new Set<string>();
  const unique = actions.filter(a => {
    const k = JSON.stringify(a);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { actions: unique, problems };
}

/**
 * True when the phrase is worth interpreting: a command word, or a team /
 * "number" plus a jersey number. Anything else is table chatter.
 */
export function looksLikeCommand(text: string, game?: Game): boolean {
  const n = normalise(text);
  if (COMMAND_RE.test(n)) return true;
  if (!/\b\d{1,2}\b/.test(n)) return false;
  if (/\bnumber\b/.test(n)) return true;
  return game ? findMentions(n, teamKeywords(game)).length > 0 : false;
}

// ---------------------------------------------------------------- display

export function teamLabel(game: Game, side: Side): string {
  const team = side === 'A' ? game.teamA : game.teamB;
  return team.name || `Team ${side}`;
}

export function describeAction(a: VoiceAction, game: Game): string {
  switch (a.kind) {
    case 'foul': {
      const who =
        a.subject === 'player'
          ? `#${a.number}${playerName(game, a.side, a.number!)}`
          : a.subject;
      const ft = a.freeThrows ? ` — ${a.freeThrows} shot${a.freeThrows > 1 ? 's' : ''}` : '';
      const kind = a.type === 'personal' ? 'Foul' : `${FOUL_TYPE_LABEL[a.type]} foul`;
      return `${kind} on ${teamLabel(game, a.side)} ${who}${ft}, at ${a.clock}`;
    }
    case 'score':
      return `+${a.points} point${a.points > 1 ? 's' : ''} — ${teamLabel(game, a.side)}${a.number ? ` #${a.number}${playerName(game, a.side, a.number)}` : ''}`;
    case 'timeout':
      return `Timeout — ${teamLabel(game, a.side)} at ${a.clock} (timer started)`;
    case 'warning':
      return `${WARNING_TYPE_LABEL[a.warningType]} — ${teamLabel(game, a.side)} at ${a.clock}`;
    case 'possession':
      return a.initial
        ? `Opening arrow → ${teamLabel(game, a.side)} (points ${a.direction})`
        : `Arrow → ${teamLabel(game, a.side)} (points ${a.direction}) · ${POSSESSION_REASON_SHORT[a.reason]} at ${a.clock}`;
    case 'quarterScore':
      return `End of ${game.currentQuarter} — scoreboard ${teamLabel(game, 'A')} ${a.a} – ${teamLabel(game, 'B')} ${a.b}${a.flipArrow && game.possessionArrow ? ' (arrow flips for 2nd half)' : ''}`;
    case 'protest':
      return `Protest — ${teamLabel(game, a.side)}${a.reason ? `: ${a.reason}` : ''} at ${a.clock}`;
  }
}

function playerName(game: Game, side: Side, number: string): string {
  const team = side === 'A' ? game.teamA : game.teamB;
  const p = team.players.find(pl => String(+pl.number) === number || pl.number === number);
  if (!p) return ' (not on roster — will be added)';
  return p.name ? ` ${p.name}` : '';
}

