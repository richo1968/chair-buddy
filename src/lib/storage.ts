import type { Game, Team } from '@/types';
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

function migrateGame(g: LegacyGame): Game {
  return {
    ...(g as Game),
    teamA: migrateTeam(g.teamA),
    teamB: migrateTeam(g.teamB),
    layout: g.layout ?? 'A-left'
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
