import type {
  FoulEvent,
  FoulType,
  Game,
  GameEvent,
  PossessionChangeEvent,
  PossessionReason,
  ProtestEvent,
  QuarterScoreRecordedEvent,
  TimeoutEvent,
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

// FIBA Rule 12 — alternating possession trigger labels.
export const POSSESSION_REASON_LABEL: Record<PossessionReason, string> = {
  'quarter-start': 'Start-of-period throw-in',
  'held-ball': 'Held ball',
  'lodged-ball': 'Ball lodged in basket support',
  'officials-uncertainty': "Officials' uncertainty (out of bounds)"
};

export const POSSESSION_REASON_SHORT: Record<PossessionReason, string> = {
  'quarter-start': 'Period throw-in',
  'held-ball': 'Held ball',
  'lodged-ball': 'Lodged ball',
  'officials-uncertainty': "Officials' call"
};

export const POSSESSION_REASONS: readonly PossessionReason[] = [
  'quarter-start',
  'held-ball',
  'lodged-ball',
  'officials-uncertainty'
];

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
    case 'timeout':
      return describeTimeout(event as TimeoutEvent, game);
    case 'protest':
      return describeProtest(event as ProtestEvent, game);
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
  let prefix: string;
  if (on.kind === 'coach') {
    prefix = `${base} coach`;
  } else if (on.kind === 'bench') {
    prefix = `${base} bench`;
  } else {
    const player = team.players.find(p => p.id === on.playerId);
    const tag = player
      ? `#${player.number}${player.name ? ' ' + player.name : ''}`
      : '(removed player)';
    prefix = `${base} ${tag}`;
  }
  let result = `${prefix} — ${FOUL_TYPE_LABEL[e.type]}`;
  if (e.freeThrows) {
    const { attempted, made } = e.freeThrows;
    result += ` · FT ${made}/${attempted}`;
  }
  return result;
}

function describeWarning(e: WarningEvent, game: Game): string {
  const side = warningTargetSide(e.target);
  const label = WARNING_TYPE_LABEL[e.warningType];
  return `${label}: ${teamName(game, side)}${e.note ? ` — ${e.note}` : ''}`;
}

function describePossession(e: PossessionChangeEvent, game: Game): string {
  if (e.halftimeFlip) {
    return `Halftime — arrow flipped to ${e.newArrowDirection}. Possession stays with ${teamName(game, e.newTeam)}.`;
  }
  const base = `Possession → ${teamName(game, e.newTeam)} (arrow ${e.newArrowDirection})`;
  if (e.reason) {
    return `${base} · ${POSSESSION_REASON_SHORT[e.reason]}`;
  }
  return base;
}

function describeQuarterScore(e: QuarterScoreRecordedEvent): string {
  return `${e.quarterScored} score recorded: ${e.teamAScore} – ${e.teamBScore}`;
}

function describeTimeout(e: TimeoutEvent, game: Game): string {
  const label = e.forfeited ? 'Timeout forfeited' : 'Timeout';
  return `${teamName(game, e.team)} — ${label}`;
}

function describeProtest(e: ProtestEvent, game: Game): string {
  return `${teamName(game, e.team)} — Protest${e.reason ? ': ' + e.reason : ''}`;
}

export function eventSideTint(event: GameEvent, game: Game): string | null {
  if (event.kind === 'foul') {
    return event.team === 'A' ? game.teamA.jerseyColour : game.teamB.jerseyColour;
  }
  if (event.kind === 'possessionChange') {
    return event.newTeam === 'A' ? game.teamA.jerseyColour : game.teamB.jerseyColour;
  }
  if (event.kind === 'warning') {
    const side = warningTargetSide(event.target);
    return side === 'A' ? game.teamA.jerseyColour : game.teamB.jerseyColour;
  }
  if (event.kind === 'timeout') {
    return event.team === 'A' ? game.teamA.jerseyColour : game.teamB.jerseyColour;
  }
  if (event.kind === 'protest') {
    return event.team === 'A' ? game.teamA.jerseyColour : game.teamB.jerseyColour;
  }
  return null;
}
