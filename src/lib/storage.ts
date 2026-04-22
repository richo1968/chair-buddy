import type { Game, GameEvent, Team } from '@/types';
import { contrastText } from '@/lib/colours';

const GAMES_KEY = 'scoretable-chair:games';
const SCHEMA_KEY = 'scoretable-chair:schema';
const SCHEMA_VERSION = 2;

type LegacyTeam = Partial<Team> & { colour?: string };
type LegacyGame = Partial<Game> & { teamA?: LegacyTeam; teamB?: LegacyTeam };

function migrateTeam(t: LegacyTeam | undefined): Team {
  const fallback = '#6b7280';
  const jersey = t?.jerseyColour ?? t?.colour ?? fallback;
  return {
    name: t?.name ?? '',
    jerseyColour: jersey,
    numberColour: t?.numberColour ?? contrastText(jersey),
    players: t?.players ?? []
  };
}

function migrateEvent(e: GameEvent): GameEvent {
  if (e.kind === 'warning') {
    const legacy = e.target as unknown as string;
    if (legacy === 'benchA') return { ...e, target: 'teamA' };
    if (legacy === 'benchB') return { ...e, target: 'teamB' };
  }
  if (e.kind === 'foul') {
    const legacyFoul = e as unknown as {
      playerId?: string;
      on?: { kind: string };
    };
    if (!legacyFoul.on && legacyFoul.playerId) {
      return {
        ...e,
        on: { kind: 'player', playerId: legacyFoul.playerId }
      };
    }
  }
  if (e.kind === 'possessionChange') {
    const legacy = e as unknown as {
      newTeam?: string;
      newArrowDirection?: string;
      newDirection?: string;
    };
    if (!legacy.newTeam || !legacy.newArrowDirection) {
      return {
        ...e,
        newTeam: (legacy.newTeam ?? legacy.newDirection ?? 'A') as 'A' | 'B',
        newArrowDirection: (legacy.newArrowDirection ?? 'left') as 'left' | 'right'
      };
    }
  }
  return e;
}

function migrateGame(g: LegacyGame): Game {
  const base = g as Game;
  return {
    ...base,
    teamA: migrateTeam(g.teamA),
    teamB: migrateTeam(g.teamB),
    layout: g.layout ?? 'A-left',
    finished: g.finished ?? false,
    arrowDirection: base.arrowDirection ?? null,
    events: (base.events ?? []).map(migrateEvent)
  };
}

export function loadGames(): Game[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateGame);
  } catch {
    return [];
  }
}

export function saveGames(games: Game[]): void {
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
    localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  } catch (err) {
    console.error('Failed to save games', err);
  }
}
