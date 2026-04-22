import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { Button } from '@/components/ui/Button';

export function GameScreen() {
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
          <div className="text-sm text-muted-fg">
            {activeGame.date}
            {activeGame.division && ` · ${activeGame.division}`}
          </div>
        </header>

        <div className="rounded-3xl border border-border bg-surface p-8 text-center space-y-3">
          <div className="text-sm uppercase tracking-widest text-muted-fg">
            Milestone 4 placeholder
          </div>
          <div className="text-3xl font-bold">
            {activeGame.teamA.name || 'Team A'} vs {activeGame.teamB.name || 'Team B'}
          </div>
          <div className="text-muted-fg">
            The main game screen (fouls, possession, warnings, quarter advance) lives here —
            coming in milestone 4.
          </div>
          <div className="pt-4 text-xs text-muted-fg font-mono">
            Players: A={activeGame.teamA.players.length}, B={activeGame.teamB.players.length} ·
            Events: {activeGame.events.length}
          </div>
        </div>
      </div>
    </div>
  );
}
