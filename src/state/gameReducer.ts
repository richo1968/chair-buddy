import type {
  AppState,
  BenchLayout,
  Game,
  GameEvent,
  Player,
  Quarter,
  Side,
  Team
} from '@/types';
import { DEFAULT_CLOCK } from '@/components/GameClockInput';
import { newId, nextQuarter } from '@/lib/game';

export type Action =
  | { type: 'LOAD'; games: Game[] }
  | { type: 'NEW_GAME' }
  | { type: 'CREATE_GAME'; game: Game }
  | { type: 'OPEN_GAME'; id: string }
  | { type: 'OPEN_REVIEW'; id: string }
  | { type: 'GO_HOME' }
  | { type: 'DELETE_GAME'; id: string }
  | { type: 'ADD_EVENT'; event: GameEvent }
  | { type: 'UPDATE_EVENT'; eventId: string; patch: Partial<GameEvent> }
  | { type: 'DELETE_EVENT'; eventId: string }
  | { type: 'SET_LAST_CLOCK'; clock: string }
  | { type: 'SET_POSSESSION'; arrow: Side | null }
  | {
      type: 'INITIAL_POSSESSION';
      team: Side;
      direction: 'left' | 'right';
    }
  | { type: 'SET_LAYOUT'; layout: BenchLayout }
  | { type: 'SWAP_BENCHES' }
  | { type: 'FINISH_GAME' }
  | { type: 'REOPEN_GAME'; id: string }
  | { type: 'ADVANCE_QUARTER' }
  | { type: 'SET_QUARTER'; quarter: Quarter }
  | {
      type: 'RECORD_QUARTER_SCORE';
      gameClock: string;
      teamAScore: number;
      teamBScore: number;
    }
  | { type: 'UPDATE_QUARTER_SCORE'; quarter: Quarter; teamAScore: number; teamBScore: number }
  | { type: 'UPDATE_TEAM'; side: Side; patch: Partial<Omit<Team, 'players'>> }
  | { type: 'ADD_PLAYER'; side: Side; player: Player }
  | { type: 'UPDATE_PLAYER'; side: Side; playerId: string; patch: Partial<Player> }
  | { type: 'DELETE_PLAYER'; side: Side; playerId: string };

export const initialState: AppState = {
  games: [],
  view: 'home',
  activeGameId: null,
  loaded: false
};

function touch<T extends { updatedAt: number }>(g: T): T {
  return { ...g, updatedAt: Date.now() };
}

function updateTeam(g: Game, side: Side, patch: Partial<Team>): Game {
  if (side === 'A') return touch({ ...g, teamA: { ...g.teamA, ...patch } });
  return touch({ ...g, teamB: { ...g.teamB, ...patch } });
}

function mapActive(state: AppState, fn: (g: Game) => Game): AppState {
  if (!state.activeGameId) return state;
  return {
    ...state,
    games: state.games.map(g => (g.id === state.activeGameId ? fn(g) : g))
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, games: action.games, loaded: true };

    case 'NEW_GAME':
      return { ...state, view: 'setup', activeGameId: null };

    case 'CREATE_GAME':
      return {
        ...state,
        games: [action.game, ...state.games],
        view: 'game',
        activeGameId: action.game.id
      };

    case 'OPEN_GAME':
      return { ...state, view: 'game', activeGameId: action.id };

    case 'OPEN_REVIEW':
      return { ...state, view: 'review', activeGameId: action.id };

    case 'GO_HOME':
      return { ...state, view: 'home', activeGameId: null };

    case 'DELETE_GAME':
      return {
        ...state,
        games: state.games.filter(g => g.id !== action.id),
        activeGameId:
          state.activeGameId === action.id ? null : state.activeGameId,
        view:
          state.activeGameId === action.id ? 'home' : state.view
      };

    case 'ADD_EVENT':
      return mapActive(state, g => {
        const next: Game = {
          ...g,
          events: [...g.events, action.event],
          lastGameClock: action.event.gameClock,
          updatedAt: Date.now()
        };
        if (action.event.kind === 'possessionChange') {
          next.possessionArrow = action.event.newDirection;
        }
        return next;
      });

    case 'UPDATE_EVENT':
      return mapActive(state, g =>
        touch({
          ...g,
          events: g.events.map(ev =>
            ev.id === action.eventId
              ? ({ ...ev, ...action.patch } as GameEvent)
              : ev
          )
        })
      );

    case 'DELETE_EVENT':
      return mapActive(state, g =>
        touch({
          ...g,
          events: g.events.filter(ev => ev.id !== action.eventId)
        })
      );

    case 'SET_LAST_CLOCK':
      return mapActive(state, g => touch({ ...g, lastGameClock: action.clock }));

    case 'SET_POSSESSION':
      return mapActive(state, g => touch({ ...g, possessionArrow: action.arrow }));

    case 'INITIAL_POSSESSION': {
      const { team, direction } = action;
      const layout: BenchLayout =
        team === 'A'
          ? direction === 'left'
            ? 'A-left'
            : 'A-right'
          : direction === 'left'
            ? 'A-right'
            : 'A-left';
      return mapActive(state, g =>
        touch({ ...g, possessionArrow: team, layout })
      );
    }

    case 'FINISH_GAME':
      return mapActive(state, g => touch({ ...g, finished: true }));

    case 'REOPEN_GAME':
      return {
        ...state,
        games: state.games.map(g =>
          g.id === action.id ? { ...g, finished: false, updatedAt: Date.now() } : g
        )
      };

    case 'SET_LAYOUT':
      return mapActive(state, g => touch({ ...g, layout: action.layout }));

    case 'SWAP_BENCHES':
      return mapActive(state, g =>
        touch({ ...g, layout: g.layout === 'A-left' ? 'A-right' : 'A-left' })
      );

    case 'ADVANCE_QUARTER':
      return mapActive(state, g =>
        touch({
          ...g,
          currentQuarter: nextQuarter(g.currentQuarter),
          lastGameClock: DEFAULT_CLOCK
        })
      );

    case 'SET_QUARTER':
      return mapActive(state, g => touch({ ...g, currentQuarter: action.quarter }));

    case 'RECORD_QUARTER_SCORE':
      return mapActive(state, g => {
        const existing = g.quarterScores.find(qs => qs.quarter === g.currentQuarter);
        const quarterScores = existing
          ? g.quarterScores.map(qs =>
              qs.quarter === g.currentQuarter
                ? {
                    quarter: qs.quarter,
                    teamAScore: action.teamAScore,
                    teamBScore: action.teamBScore
                  }
                : qs
            )
          : [
              ...g.quarterScores,
              {
                quarter: g.currentQuarter,
                teamAScore: action.teamAScore,
                teamBScore: action.teamBScore
              }
            ];
        const event: GameEvent = {
          id: newId(),
          kind: 'quarterScoreRecorded',
          quarter: g.currentQuarter,
          quarterScored: g.currentQuarter,
          gameClock: action.gameClock,
          wallTimestamp: Date.now(),
          teamAScore: action.teamAScore,
          teamBScore: action.teamBScore
        };
        return touch({
          ...g,
          quarterScores,
          events: [...g.events, event],
          currentQuarter: nextQuarter(g.currentQuarter),
          lastGameClock: DEFAULT_CLOCK
        });
      });

    case 'UPDATE_QUARTER_SCORE':
      return mapActive(state, g =>
        touch({
          ...g,
          quarterScores: g.quarterScores.map(qs =>
            qs.quarter === action.quarter
              ? {
                  quarter: qs.quarter,
                  teamAScore: action.teamAScore,
                  teamBScore: action.teamBScore
                }
              : qs
          )
        })
      );

    case 'UPDATE_TEAM':
      return mapActive(state, g => updateTeam(g, action.side, action.patch));

    case 'ADD_PLAYER':
      return mapActive(state, g =>
        updateTeam(g, action.side, {
          players: [...(action.side === 'A' ? g.teamA : g.teamB).players, action.player]
        })
      );

    case 'UPDATE_PLAYER':
      return mapActive(state, g => {
        const team = action.side === 'A' ? g.teamA : g.teamB;
        return updateTeam(g, action.side, {
          players: team.players.map(p =>
            p.id === action.playerId ? { ...p, ...action.patch } : p
          )
        });
      });

    case 'DELETE_PLAYER':
      return mapActive(state, g => {
        const team = action.side === 'A' ? g.teamA : g.teamB;
        return updateTeam(g, action.side, {
          players: team.players.filter(p => p.id !== action.playerId)
        });
      });
  }
}
