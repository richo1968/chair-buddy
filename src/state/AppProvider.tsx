import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode
} from 'react';
import { initialState, reducer, type Action } from './gameReducer';
import { loadGames, saveGames } from '@/lib/storage';
import {
  deleteGameFromCloud,
  mergeLocalAndCloud,
  upsertGameToCloud
} from '@/lib/cloudStorage';
import { useAuth } from './AuthProvider';
import type { AppState, Game } from '@/types';

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
  activeGame: Game | null;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user, loading: authLoading } = useAuth();

  const lastSyncedAt = useRef<Record<string, number>>({});
  const knownIds = useRef<Set<string>>(new Set());

  // Initial load — once auth status is known, load from cloud (if authed) or local.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      const local = loadGames();
      if (user) {
        const merged = await mergeLocalAndCloud(local, user.id);
        if (cancelled) return;
        // Prime sync bookkeeping so we don't immediately re-upload the same data.
        lastSyncedAt.current = Object.fromEntries(
          merged.map(g => [g.id, g.updatedAt])
        );
        knownIds.current = new Set(merged.map(g => g.id));
        dispatch({ type: 'LOAD', games: merged });
      } else {
        // Guest mode — local only. Reset cloud bookkeeping.
        lastSyncedAt.current = {};
        knownIds.current = new Set(local.map(g => g.id));
        dispatch({ type: 'LOAD', games: local });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  // Local persistence — always on.
  useEffect(() => {
    if (!state.loaded) return;
    saveGames(state.games);
  }, [state.games, state.loaded]);

  // Cloud persistence — only when authed. Upsert changed games, delete removed.
  useEffect(() => {
    if (!state.loaded || !user) return;
    const currentIds = new Set<string>();
    for (const game of state.games) {
      currentIds.add(game.id);
      const lastTs = lastSyncedAt.current[game.id] ?? 0;
      if (game.updatedAt > lastTs) {
        lastSyncedAt.current[game.id] = game.updatedAt;
        upsertGameToCloud(game, user.id).catch(err =>
          console.error('[cloud] upsert error', err)
        );
      }
    }
    for (const id of knownIds.current) {
      if (!currentIds.has(id)) {
        delete lastSyncedAt.current[id];
        deleteGameFromCloud(id).catch(err =>
          console.error('[cloud] delete error', err)
        );
      }
    }
    knownIds.current = currentIds;
  }, [state.games, state.loaded, user]);

  const activeGame = useMemo(
    () => state.games.find(g => g.id === state.activeGameId) ?? null,
    [state.games, state.activeGameId]
  );

  return (
    <AppCtx.Provider value={{ state, dispatch, activeGame }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}
