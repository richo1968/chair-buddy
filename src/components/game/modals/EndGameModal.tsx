import { useState } from 'react';
import { Flag, AlertTriangle, X } from 'lucide-react';
import type { Game, GameOutcome, Side, Team } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { totalScore } from '@/lib/game';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onConfirm: (outcome: GameOutcome) => void;
}

type Choice = 'final' | 'forfeit' | 'default';

export function EndGameModal({ open, game, onClose, onConfirm }: Props) {
  const [choice, setChoice] = useState<Choice>('final');
  const [winner, setWinner] = useState<Side>('A');

  if (!open) return null;

  const totA = totalScore(game, 'A');
  const totB = totalScore(game, 'B');
  const inferredWinner: Side | null =
    totA > totB ? 'A' : totB > totA ? 'B' : null;

  const submit = () => {
    if (choice === 'final') {
      onConfirm({ kind: 'final' });
    } else if (choice === 'forfeit') {
      onConfirm({ kind: 'forfeit', winner });
    } else {
      onConfirm({ kind: 'default', winner });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="End this game"
      subtitle="Pick the outcome. The game becomes read-only — you can reopen it later."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit}>
            <Flag className="w-4 h-4" />
            End game
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <ChoiceCard
            active={choice === 'final'}
            onClick={() => setChoice('final')}
            title="Final"
            description={
              inferredWinner
                ? `Played in full. Winner by score: ${
                    inferredWinner === 'A'
                      ? game.teamA.name || 'Team A'
                      : game.teamB.name || 'Team B'
                  } (${totA}–${totB}).`
                : `Played in full. Currently tied ${totA}–${totB} — record any pending OT before finalising.`
            }
          />
          <ChoiceCard
            active={choice === 'forfeit'}
            onClick={() => setChoice('forfeit')}
            title="Forfeit"
            description="A team refused to play, didn't show, or couldn't field the minimum required players (FIBA Rule 21)."
            icon={<AlertTriangle className="w-4 h-4 text-warn" />}
          />
          <ChoiceCard
            active={choice === 'default'}
            onClick={() => setChoice('default')}
            title="Default"
            description="A team has fewer than 2 players able to play during the game (FIBA Rule 22)."
            icon={<X className="w-4 h-4 text-danger" />}
          />
        </div>

        {(choice === 'forfeit' || choice === 'default') && (
          <div className="rounded-2xl border border-border bg-surface-hi p-4 space-y-3">
            <div className="text-sm text-muted-fg uppercase tracking-widest">
              Winning team
            </div>
            <div className="grid grid-cols-2 gap-2">
              <WinnerCard
                team={game.teamA}
                side="A"
                active={winner === 'A'}
                onClick={() => setWinner('A')}
              />
              <WinnerCard
                team={game.teamB}
                side="B"
                active={winner === 'B'}
                onClick={() => setWinner('B')}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ChoiceCard({
  active,
  onClick,
  title,
  description,
  icon
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border-2 px-4 py-3 text-left',
        'flex gap-3 active:brightness-110 transition-none',
        active
          ? 'border-accent bg-accent/10'
          : 'border-border bg-surface'
      )}
    >
      <span
        className={cn(
          'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
          active ? 'border-accent bg-accent' : 'border-border'
        )}
      >
        {active && <span className="w-1.5 h-1.5 rounded-full bg-bg" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold flex items-center gap-2">
          {icon}
          {title}
        </div>
        <div className="text-xs text-muted-fg mt-0.5 leading-relaxed">
          {description}
        </div>
      </div>
    </button>
  );
}

function WinnerCard({
  team,
  side,
  active,
  onClick
}: {
  team: Team;
  side: Side;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 p-3 text-left active:brightness-110 transition-none',
        active ? 'border-accent ring-2 ring-accent/30' : 'border-border'
      )}
      style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
    >
      <div className="text-[10px] uppercase tracking-widest opacity-70">
        Team {side} wins
      </div>
      <div className="text-base font-bold truncate">
        {team.name || `Team ${side}`}
      </div>
    </button>
  );
}
