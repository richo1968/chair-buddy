import { supabase } from './supabase';
import type { Game } from '@/types';

interface GameRow {
  id: string;
  user_id: string;
  data: Game;
  updated_at: string;
}

export async function loadGamesFromCloud(userId: string): Promise<Game[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('games')
    .select('id,data,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[cloud] load failed', error);
    return [];
  }
  return (data as unknown as GameRow[]).map(row => row.data);
}

export async function upsertGameToCloud(
  game: Game,
  userId: string
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('games').upsert(
    {
      id: game.id,
      user_id: userId,
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
export async function mergeLocalAndCloud(
  localGames: Game[],
  userId: string
): Promise<Game[]> {
  if (!supabase) return localGames;
  const cloud = await loadGamesFromCloud(userId);
  const byId = new Map<string, Game>();
  for (const g of cloud) byId.set(g.id, g);
  for (const local of localGames) {
    const remote = byId.get(local.id);
    if (!remote || local.updatedAt > remote.updatedAt) {
      await upsertGameToCloud(local, userId);
      byId.set(local.id, local);
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}
