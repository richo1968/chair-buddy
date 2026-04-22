import type {
  FoulEvent,
  FoulType,
  Game,
  GameEvent,
  PossessionChangeEvent,
  QuarterScoreRecordedEvent,
  WarningEvent,
  WarningTarget,
  WarningType,
  Side
} from '@/types';

export const FOUL_TYPE_LABEL: Record<FoulType, string> = {
  personal: 'Personal',
  technical: 'Technical',
  unsportsmanlike: 'Unsportsmanlike',
  disqualifying: 'Disqualifying'
};

export const FOUL_TYPE_SHORT: Record<FoulType, string> = {
  personal: 'P',
  technical: 'T',
  unsportsmanlike: 'U',
  disqualifying: 'D'
};

export const WARNING_TYPES: readonly WarningType[] = [
  'general',
  'time-delay',
  'flop'
];

export const WARNING_TYPE_LABEL: Record<WarningType, string> = {
  general: 'General warning',
  'time-delay': 'Time-delay warning',
  flop: 'Flop warning'
};

export const WARNING_TYPE_SHORT: Record<WarningType, string> = {
  general: 'General',
  'time-delay': 'Time-delay',
  flop: 'Flop'
};

export const WARNING_TARGET_LABEL: Record<WarningTarget, string> = {
  teamA: 'Team A',
  teamB: 'Team B'
};

export function warningTargetSide(t: WarningTarget): Side {
  return t === 'teamA' ? 'A' : 'B';
}

export function describeEvent(event: GameEvent, game: Game): string {
  switch (event.kind) {
    case 'foul':
      return describeFoul(event as FoulEvent, game);
    case 'warning':
      return describeWarning(event as WarningEvent, game);
    case 'possessionChange':
      return describePossession(event as PossessionChangeEvent, game);
    case 'quarterScoreRecorded':
      return describeQuarterScore(event as QuarterScoreRecordedEvent);
  }
}

function teamName(game: Game, side: Side): string {
  const team = side === 'A' ? game.teamA : game.teamB;
  return team.name || `Team ${side}`;
}

function describeFoul(e: FoulEvent, game: Game): string {
  const team = e.team === 'A' ? game.teamA : game.teamB;
  const base = teamName(game, e.team);
  const on = e.on;
  if (on.kind === 'coach') {
    return `${base} coach — ${FOUL_TYPE_LABEL[e.type]}`;
  }
  if (on.kind === 'bench') {
    return `${base} bench — ${FOUL_TYPE_LABEL[e.type]}`;
  }
  const player = team.players.find(p => p.id === on.playerId);
  const tag = player
    ? `#${player.number}${player.name ? ' ' + player.name : ''}`
    : '(removed player)';
  return `${base} ${tag} — ${FOUL_TYPE_LABEL[e.type]}`;
}

function describeWarning(e: WarningEvent, game: Game): string {
  const side = warningTargetSide(e.target);
  const label = WARNING_TYPE_LABEL[e.warningType];
  return `${label}: ${teamName(game, side)}${e.note ? ` — ${e.note}` : ''}`;
}

function describePossession(e: PossessionChangeEvent, game: Game): string {
  return `Possession → ${teamName(game, e.newDirection)}`;
}

function describeQuarterScore(e: QuarterScoreRecordedEvent): string {
  return `${e.quarterScored} score recorded: ${e.teamAScore} – ${e.teamBScore}`;
}

export function eventSideTint(event: GameEvent, game: Game): string | null {
  if (event.kind === 'foul') {
    return event.team === 'A' ? game.teamA.jerseyColour : game.teamB.jerseyColour;
  }
  if (event.kind === 'possessionChange') {
    return event.newDirection === 'A' ? game.teamA.jerseyColour : game.teamB.jerseyColour;
  }
  if (event.kind === 'warning') {
    const side = warningTargetSide(event.target);
    return side === 'A' ? game.teamA.jerseyColour : game.teamB.jerseyColour;
  }
  return null;
}
