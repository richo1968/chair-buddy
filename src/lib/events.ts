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

export const WARNING_TYPE_LABEL: Record<WarningType, string> = {
  general: 'Warning',
  'time-delay': 'Time-delay'
};

export const WARNING_TARGET_LABEL: Record<WarningTarget, string> = {
  teamA: 'Team A',
  teamB: 'Team B',
  benchA: 'Bench A',
  benchB: 'Bench B'
};

export function warningTargetSide(t: WarningTarget): Side {
  return t === 'teamA' || t === 'benchA' ? 'A' : 'B';
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
  const player = team.players.find(p => p.id === e.playerId);
  const tag = player
    ? `#${player.number}${player.name ? ' ' + player.name : ''}`
    : '(removed player)';
  return `${teamName(game, e.team)} ${tag} — ${FOUL_TYPE_LABEL[e.type]}`;
}

function describeWarning(e: WarningEvent, game: Game): string {
  const side = warningTargetSide(e.target);
  const isBench = e.target === 'benchA' || e.target === 'benchB';
  const base = `${teamName(game, side)}${isBench ? ' bench' : ''}`;
  const type = WARNING_TYPE_LABEL[e.warningType];
  return `${type}: ${base}${e.note ? ` — ${e.note}` : ''}`;
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
