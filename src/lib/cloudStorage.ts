import { supabase } from './supabase';
import { migrateGame } from './storage';
import type { Game } from '@/types';

interface GameRow {
  id: string;
  data: Game;
  updated_at: string;
}

/** How many of the most recently updated shared games to keep on the device. */
const CLOUD_GAME_LIMIT = 300;

/**
 * Games are shared across all approved chairs (see supabase/migrations) —
 * this loads everyone's games, not just the signed-in user's.
 */
export async function loadGamesFromCloud(): Promise<Game[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('games')
    .select('id,data,updated_at')
    .order('updated_at', { ascending: false })
    .limit(CLOUD_GAME_LIMIT);
  if (error) {
    console.error('[cloud] load failed', error);
    return [];
  }
  // Run the same migration we use for localStorage — cloud rows saved before
  // a schema bump can be missing newer fields (e.g. `outcome`), which would
  // otherwise crash the renderer accessing them.
  return (data as unknown as GameRow[]).map(row => migrateGame(row.data));
}

export async function upsertGameToCloud(game: Game): Promise<void> {
  if (!supabase) return;
  // created_by / updated_by and the listing columns are filled by triggers.
  const { error } = await supabase.from('games').upsert(
    {
      id: game.id,
      data: game,
      updated_at: new Date(game.updatedAt).toISOString()
    },
    { onConflict: 'id' }
  );
  if (error) console.error('[cloud] upsert failed', error);
}

export async function deleteGameFromCloud(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) console.error('[cloud] delete failed', error);
}

/**
 * Merge local games with cloud games. Strategy:
 *  - For each id, keep whichever side has the later updatedAt.
 *  - Push local games that are newer (or don't exist remotely) to cloud.
 * Returns the merged canonical list.
 */
export async function mergeLocalAndCloud(localGames: Game[]): Promise<Game[]> {
  if (!supabase) return localGames;
  const cloud = await loadGamesFromCloud();
  const byId = new Map<string, Game>();
  for (const g of cloud) byId.set(g.id, g);
  for (const local of localGames) {
    const remote = byId.get(local.id);
    if (!remote || local.updatedAt > remote.updatedAt) {
      await upsertGameToCloud(local);
      byId.set(local.id, local);
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}
