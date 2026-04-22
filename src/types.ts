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
}

export type BenchLayout = 'A-left' | 'A-right';

export type FoulType = 'personal' | 'technical' | 'unsportsmanlike' | 'disqualifying';
export type WarningType = 'general' | 'time-delay';
export type WarningTarget = 'teamA' | 'teamB' | 'benchA' | 'benchB';

export interface EventBase {
  id: string;
  gameClock: string;
  wallTimestamp: number;
  quarter: Quarter;
}

export interface PossessionChangeEvent extends EventBase {
  kind: 'possessionChange';
  newDirection: Side;
}

export interface FoulEvent extends EventBase {
  kind: 'foul';
  team: Side;
  playerId: string;
  type: FoulType;
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

export type GameEvent =
  | PossessionChangeEvent
  | FoulEvent
  | WarningEvent
  | QuarterScoreRecordedEvent;

export interface QuarterScore {
  quarter: Quarter;
  teamAScore: number;
  teamBScore: number;
}

export interface Game {
  id: string;
  date: string;
  division: string;
  teamA: Team;
  teamB: Team;
  currentQuarter: Quarter;
  possessionArrow: Side | null;
  layout: BenchLayout;
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
