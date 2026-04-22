import { ArrowLeft, RotateCcw, Play } from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { Button } from '@/components/ui/Button';

export function ReviewScreen() {
  const { dispatch, activeGame } = useApp();
  if (!activeGame) return null;

  return (
    <div className="min-h-full w-full bg-bg text-fg p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="md"
            onClick={() => dispatch({ type: 'GO_HOME' })}
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
          <div className="flex items-center gap-2">
            {activeGame.finished ? (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  dispatch({ type: 'REOPEN_GAME', id: activeGame.id });
                  dispatch({ type: 'OPEN_GAME', id: activeGame.id });
                }}
              >
                <RotateCcw className="w-4 h-4" />
                Reopen &amp; continue
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => dispatch({ type: 'OPEN_GAME', id: activeGame.id })}
              >
                <Play className="w-4 h-4" />
                Resume
              </Button>
            )}
          </div>
        </header>

        <div className="rounded-3xl border border-border bg-surface p-8 text-center space-y-3">
          <div className="text-sm uppercase tracking-widest text-muted-fg">
            {activeGame.finished ? 'Final' : 'Live — viewing only'}
          </div>
          <div className="text-3xl font-bold">
            Review: {activeGame.teamA.name || 'Team A'} vs {activeGame.teamB.name || 'Team B'}
          </div>
          <div className="text-muted-fg">
            Full read-only event log and text export — coming in milestone 5.
          </div>
        </div>
      </div>
    </div>
  );
}
