import { useState } from 'react';
import { Plus, Moon, Sun, Trash2 } from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/hooks/useTheme';
import { useLongPress } from '@/hooks/useLongPress';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { totalScore } from '@/lib/game';
import type { Game } from '@/types';
import { cn } from '@/lib/utils';

export function HomeScreen() {
  const { state, dispatch } = useApp();
  const [theme, toggleTheme] = useTheme();
  const [pendingDelete, setPendingDelete] = useState<Game | null>(null);

  const games = [...state.games].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-full w-full bg-bg text-fg p-6 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scoretable</h1>
            <div className="text-sm text-muted-fg mt-1">FIBA event logger</div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="tap-target rounded-2xl border border-border bg-surface flex items-center justify-center active:brightness-125 transition-none"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </header>

        <Button
          size="xl"
          className="w-full mb-8"
          onClick={() => dispatch({ type: 'NEW_GAME' })}
        >
          <Plus className="w-6 h-6" />
          New Game
        </Button>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold">Past games</h2>
            <div className="text-xs text-muted-fg">
              Long-press a row to delete
            </div>
          </div>

          {games.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted-fg">
              No games yet. Tap "New Game" to start.
            </div>
          ) : (
            <ul className="space-y-2">
              {games.map(g => (
                <GameRow
                  key={g.id}
                  game={g}
                  onOpen={() =>
                    dispatch(
                      g.finished
                        ? { type: 'OPEN_REVIEW', id: g.id }
                        : { type: 'OPEN_GAME', id: g.id }
                    )
                  }
                  onDeleteRequest={() => setPendingDelete(g)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete game?"
        message={
          pendingDelete
            ? `${pendingDelete.date} · ${pendingDelete.teamA.name || 'Team A'} vs ${pendingDelete.teamB.name || 'Team B'}. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) dispatch({ type: 'DELETE_GAME', id: pendingDelete.id });
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function GameRow({
  game,
  onOpen,
  onDeleteRequest
}: {
  game: Game;
  onOpen: () => void;
  onDeleteRequest: () => void;
}) {
  const lp = useLongPress(onDeleteRequest);
  const scoreA = totalScore(game, 'A');
  const scoreB = totalScore(game, 'B');

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!lp.didLongPress()) onOpen();
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') onOpen();
        }}
        {...{
          onPointerDown: lp.onPointerDown,
          onPointerUp: lp.onPointerUp,
          onPointerLeave: lp.onPointerLeave,
          onPointerCancel: lp.onPointerCancel
        }}
        className={cn(
          'w-full rounded-2xl border border-border bg-surface',
          'flex items-center gap-4 p-4 min-h-tap',
          'active:bg-surface-hi transition-none cursor-pointer select-none'
        )}
      >
        <div className="flex flex-col gap-1">
          <ColourBadge hex={game.teamA.jerseyColour} />
          <ColourBadge hex={game.teamB.jerseyColour} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-fg uppercase tracking-wider flex items-center gap-2">
            <span>{game.date}</span>
            {game.division && <span>· {game.division}</span>}
            <span
              className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border',
                game.finished
                  ? 'bg-muted text-muted-fg border-border'
                  : 'bg-warn/15 text-warn border-warn/50'
              )}
            >
              {game.finished ? 'Final' : 'Live'}
            </span>
          </div>
          <div className="text-lg font-semibold truncate">
            {game.teamA.name || 'Team A'}{' '}
            <span className="text-muted-fg">vs</span>{' '}
            {game.teamB.name || 'Team B'}
          </div>
        </div>
        <div className="text-right font-mono tabular-nums text-xl">
          {scoreA} - {scoreB}
        </div>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDeleteRequest();
          }}
          aria-label="Delete game"
          className="h-11 w-11 rounded-xl border border-border bg-muted flex items-center justify-center active:bg-danger active:text-white transition-none"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

function ColourBadge({ hex }: { hex: string }) {
  return (
    <span
      className="block w-6 h-2 rounded-full"
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  );
}
