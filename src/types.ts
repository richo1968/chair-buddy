export type Side = 'A' | 'B';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4' | `OT${number}`;

export interface Player {
  id: string;
  number: string;
  name?: string;
}

export interface Team {
  name: string;
  jerseyColour: string;
  numberColour: string;
  players: Player[];
  /** Player ID of the team captain, if designated. */
  captainId?: string;
  /** Head coach name. */
  coachName?: string;
  /** Assistant coach name. */
  assistantCoachName?: string;
}

export type BenchLayout = 'A-left' | 'A-right';

export type FoulType = 'personal' | 'technical' | 'unsportsmanlike' | 'disqualifying';

export interface FreeThrows {
  /** Number of free throws awarded as a result of the foul. */
  awarded: number;
}
export type WarningType = 'general' | 'time-delay' | 'flop';
export type WarningTarget = 'teamA' | 'teamB';

export interface EventBase {
  id: string;
  gameClock: string;
  wallTimestamp: number;
  quarter: Quarter;
}

export type ArrowDirection = 'left' | 'right';

export type PossessionReason =
  | 'quarter-start'
  | 'held-ball'
  | 'lodged-ball'
  | 'officials-uncertainty';

export interface PossessionChangeEvent extends EventBase {
  kind: 'possessionChange';
  newTeam: Side;
  newArrowDirection: ArrowDirection;
  reason?: PossessionReason;
  halftimeFlip?: boolean;
}

export type FoulSubject =
  | { kind: 'player'; playerId: string }
  | { kind: 'coach' }
  | { kind: 'bench' };

export interface FoulEvent extends EventBase {
  kind: 'foul';
  team: Side;
  on: FoulSubject;
  type: FoulType;
  /** Optional: free-throws awarded as a result of this foul. */
  freeThrows?: FreeThrows;
}

export interface WarningEvent extends EventBase {
  kind: 'warning';
  target: WarningTarget;
  warningType: WarningType;
  note?: string;
}

export interface QuarterScoreRecordedEvent extends EventBase {
  kind: 'quarterScoreRecorded';
  quarterScored: Quarter;
  teamAScore: number;
  teamBScore: number;
}

export interface ProtestEvent extends EventBase {
  kind: 'protest';
  team: Side;
  reason: string;
}

export interface TimeoutEvent extends EventBase {
  kind: 'timeout';
  team: Side;
  forfeited: boolean;
}

export type GameEvent =
  | PossessionChangeEvent
  | FoulEvent
  | WarningEvent
  | QuarterScoreRecordedEvent
  | TimeoutEvent
  | ProtestEvent;

export interface QuarterScore {
  quarter: Quarter;
  teamAScore: number;
  teamBScore: number;
}

export interface Officials {
  crewChief?: string;
  umpire1?: string;
  umpire2?: string;
  scorer?: string;
  assistantScorer?: string;
  timer?: string;
  shotClockOperator?: string;
  commissioner?: string;
}

export type GameOutcome =
  | { kind: 'live' }
  | { kind: 'final' }
  | { kind: 'forfeit'; winner: Side }
  | { kind: 'default'; winner: Side };

export interface Game {
  id: string;
  date: string;
  division: string;
  /** Optional competition / league name (separate from division within it). */
  competition?: string;
  /** Optional venue name. */
  venue?: string;
  /** Optional scheduled tip-off time, "HH:MM" 24-hour. */
  tipTime?: string;
  /** Optional table officials. */
  officials?: Officials;
  teamA: Team;
  teamB: Team;
  currentQuarter: Quarter;
  possessionArrow: Side | null;
  arrowDirection: ArrowDirection | null;
  layout: BenchLayout;
  /** Game outcome status — live, final, forfeit (with winner), default (with winner). */
  outcome: GameOutcome;
  /** @deprecated kept for backward compat with older saves; derive from outcome.kind !== 'live'. */
  finished: boolean;
  lastGameClock: string;
  events: GameEvent[];
  quarterScores: QuarterScore[];
  createdAt: number;
  updatedAt: number;
}

export type View = 'home' | 'setup' | 'game' | 'review';

export interface AppState {
  games: Game[];
  view: View;
  activeGameId: string | null;
  loaded: boolean;
}
