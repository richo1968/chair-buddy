import type { Game } from '@/types';

const GAMES_KEY = 'scoretable-chair:games';
const SCHEMA_KEY = 'scoretable-chair:schema';
const SCHEMA_VERSION = 1;

export function loadGames(): Game[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Game[];
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
