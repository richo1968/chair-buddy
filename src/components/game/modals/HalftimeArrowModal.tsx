import type { Game, Side } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  onDecision: (flip: boolean) => void;
}

export function HalftimeArrowModal({ open, game, onDecision }: Props) {
  if (!open) return null;

  const current = game.possessionArrow;
  const flipped: Side | null =
    current === 'A' ? 'B' : current === 'B' ? 'A' : null;

  return (
    <Modal
      open={open}
      onClose={() => onDecision(false)}
      dismissable={false}
      title="Halftime — flip possession arrow?"
      subtitle="Teams change direction in the third quarter. Flip the arrow if needed."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onDecision(false)}>
            Keep as is
          </Button>
          <Button
            variant="primary"
            disabled={current === null}
            onClick={() => onDecision(true)}
          >
            Flip arrow
          </Button>
        </>
      }
    >
      {current === null ? (
        <div className="text-muted-fg">
          No possession arrow is currently set — nothing to flip.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 items-stretch">
          <ArrowChip label="Current" side={current} game={game} />
          <ArrowChip label="After flip" side={flipped} game={game} highlight />
        </div>
      )}
    </Modal>
  );
}

function ArrowChip({
  label,
  side,
  game,
  highlight
}: {
  label: string;
  side: Side | null;
  game: Game;
  highlight?: boolean;
}) {
  const team = side === 'A' ? game.teamA : side === 'B' ? game.teamB : null;
  return (
    <div
      className={cn(
        'rounded-2xl border-2 p-4',
        highlight ? 'border-accent' : 'border-border'
      )}
      style={
        team
          ? { backgroundColor: team.jerseyColour, color: team.numberColour }
          : undefined
      }
    >
      <div className="text-xs uppercase tracking-widest opacity-75">{label}</div>
      <div className="text-2xl font-bold">
        {team ? team.name || `Team ${side}` : '—'}
      </div>
    </div>
  );
}
