import { useEffect, useState } from 'react';
import { Plus, Moon, Sun, Trash2, Cloud, CloudOff, LogIn, LogOut, Archive, ArchiveRestore, ArrowLeft, CalendarClock } from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { useAuth } from '@/state/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useLongPress } from '@/hooks/useLongPress';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoginModal } from '@/components/auth/LoginModal';
import { gameOutcomeLabel, isGameFinished, totalScore } from '@/lib/game';
import { checkMembership } from '@/lib/teamsRepo';
import type { Game } from '@/types';
import { cn } from '@/lib/utils';

export function HomeScreen() {
  const { state, dispatch } = useApp();
  const { user, cloudEnabled, signOut } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [pendingDelete, setPendingDelete] = useState<Game | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  // null = unknown / signed out. Signed-in users who aren't on the members
  // allow-list can't see shared data, so tell them rather than show nothing.
  const [isMember, setIsMember] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsMember(null);
      return;
    }
    let cancelled = false;
    checkMembership().then(ok => !cancelled && setIsMember(ok));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const [showArchive, setShowArchive] = useState(false);

  const active = state.games.filter(g => !g.archivedAt);
  const upcoming = active
    .filter(g => g.scheduled)
    .sort((a, b) => `${a.date} ${a.tipTime ?? ''}`.localeCompare(`${b.date} ${b.tipTime ?? ''}`));
  const games = active.filter(g => !g.scheduled).sort((a, b) => b.createdAt - a.createdAt);
  const archived = state.games
    .filter(g => g.archivedAt)
    .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));

  const open = (g: Game) =>
    dispatch(
      g.scheduled
        ? { type: 'EDIT_GAME_SETUP', id: g.id }
        : isGameFinished(g)
          ? { type: 'OPEN_REVIEW', id: g.id }
          : { type: 'OPEN_GAME', id: g.id }
    );
  const archive = (g: Game) => dispatch({ type: 'ARCHIVE_GAME', id: g.id });

  return (
    <div className="min-h-full w-full bg-bg text-fg px-6 pb-6 pt-safe-6 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">Chair Buddy</h1>
              <span className="text-[10px] font-mono text-muted-fg tracking-wider">
                v{__APP_VERSION__} · {__APP_COMMIT__}
              </span>
            </div>
            <div className="text-sm text-muted-fg mt-1">The chair's companion</div>
          </div>
          <div className="flex items-center gap-2">
            {cloudEnabled &&
              (user ? (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
                  <Cloud className="w-4 h-4 text-success" />
                  <div className="min-w-0 max-w-[180px]">
                    <div className="text-[10px] text-muted-fg uppercase tracking-widest">
                      Cloud synced
                    </div>
                    <div className="text-xs truncate">{user.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    aria-label="Sign out"
                    className="h-8 w-8 rounded-lg border border-border bg-muted flex items-center justify-center active:brightness-125 transition-none"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 active:brightness-125 transition-none text-sm font-semibold"
                >
                  <CloudOff className="w-4 h-4 text-muted-fg" />
                  <LogIn className="w-4 h-4" />
                  Sign in to sync
                </button>
              ))}
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
          </div>
        </header>

        {user && isMember === false && (
          <div className="mb-6 rounded-2xl border border-warn bg-surface px-4 py-3 text-sm">
            <span className="font-semibold">{user.email}</span> isn't approved for
            the shared Chair Buddy database yet. Games are saved on this iPad only
            until an admin adds you.
          </div>
        )}

        {showArchive ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="md" onClick={() => setShowArchive(false)}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <h2 className="text-lg font-semibold">Archive</h2>
            </div>
            {archived.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted-fg">
                Nothing archived.
              </div>
            ) : (
              <ul className="space-y-2">
                {archived.map(g => (
                  <GameRow
                    key={g.id}
                    game={g}
                    onOpen={() => open(g)}
                    actions={
                      <>
                        <RowAction
                          label="Restore game"
                          onClick={() => dispatch({ type: 'RESTORE_GAME', id: g.id })}
                        >
                          <ArchiveRestore className="w-4 h-4" />
                        </RowAction>
                        <RowAction label="Delete permanently" danger onClick={() => setPendingDelete(g)}>
                          <Trash2 className="w-4 h-4" />
                        </RowAction>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <Button
              size="xl"
              className="w-full mb-8"
              onClick={() => dispatch({ type: 'NEW_GAME' })}
            >
              <Plus className="w-6 h-6" />
              New Game
            </Button>

            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CalendarClock className="w-5 h-5" />
                  Upcoming
                </h2>
                <ul className="space-y-2">
                  {upcoming.map(g => (
                    <GameRow
                      key={g.id}
                      game={g}
                      onOpen={() => open(g)}
                      onLongPress={() => archive(g)}
                      actions={
                        <RowAction label="Archive game" onClick={() => archive(g)}>
                          <Archive className="w-4 h-4" />
                        </RowAction>
                      }
                    />
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-lg font-semibold">Past games</h2>
                <div className="text-xs text-muted-fg">Long-press a row to archive</div>
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
                      onOpen={() => open(g)}
                      onLongPress={() => archive(g)}
                      actions={
                        <RowAction label="Archive game" onClick={() => archive(g)}>
                          <Archive className="w-4 h-4" />
                        </RowAction>
                      }
                    />
                  ))}
                </ul>
              )}
            </div>

            <Button
              variant="ghost"
              size="md"
              className="mt-6"
              onClick={() => setShowArchive(true)}
            >
              <Archive className="w-4 h-4" />
              Archive ({archived.length})
            </Button>
          </>
        )}
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete permanently?"
        message={
          pendingDelete
            ? `${pendingDelete.date} · ${pendingDelete.teamA.name || 'Team A'} vs ${pendingDelete.teamB.name || 'Team B'}. This removes it for every chair and cannot be undone.`
            : ''
        }
        confirmLabel="Delete permanently"
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
  onLongPress,
  actions
}: {
  game: Game;
  onOpen: () => void;
  onLongPress?: () => void;
  actions: React.ReactNode;
}) {
  const lp = useLongPress(onLongPress ?? (() => undefined));
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
                game.scheduled
                  ? 'bg-accent/15 text-accent border-accent/50'
                  : isGameFinished(game)
                  ? game.outcome.kind === 'forfeit' || game.outcome.kind === 'default'
                    ? 'bg-danger/15 text-danger border-danger/50'
                    : 'bg-muted text-muted-fg border-border'
                  : 'bg-warn/15 text-warn border-warn/50'
              )}
            >
              {gameOutcomeLabel(game)}
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
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          {actions}
        </div>
      </div>
    </li>
  );
}

function RowAction({
  label,
  danger,
  onClick,
  children
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={e => e.stopPropagation()}
      aria-label={label}
      title={label}
      className={cn(
        'h-11 w-11 rounded-xl border border-border bg-muted flex items-center justify-center transition-none',
        danger ? 'active:bg-danger active:text-white' : 'active:bg-surface-hi'
      )}
    >
      {children}
    </button>
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
