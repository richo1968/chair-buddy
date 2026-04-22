import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode
} from 'react';
import { initialState, reducer, type Action } from './gameReducer';
import { loadGames, saveGames } from '@/lib/storage';
import type { AppState, Game } from '@/types';

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
  activeGame: Game | null;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'LOAD', games: loadGames() });
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    saveGames(state.games);
  }, [state.games, state.loaded]);

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
