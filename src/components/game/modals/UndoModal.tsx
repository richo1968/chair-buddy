import { Redo2, Undo2 } from 'lucide-react';
import type { Game, GameEvent } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { describeEvent, eventSideTint } from '@/lib/events';

interface Props {
  game: Game;
  /** Entries undone this session, newest first. */
  undone: GameEvent[];
  onUndo: (event: GameEvent) => void;
  onRedo: (event: GameEvent) => void;
  onClose: () => void;
}

const RECENT = 5;

/** The last few entries, newest first, each with its own Undo button. */
export function UndoModal({ game, undone, onUndo, onRedo, onClose }: Props) {
  const recent = [...game.events]
    .sort((a, b) => b.wallTimestamp - a.wallTimestamp)
    .slice(0, RECENT);

  return (
    <Modal
      open
      onClose={onClose}
      title="Undo"
      subtitle="Most recent first. Undo removes that entry from the game."
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-2">
        {recent.length === 0 && <div className="text-sm text-muted-fg italic">Nothing to undo yet.</div>}
        {recent.map(ev => (
          <Row key={ev.id} game={game} ev={ev}>
            <Button variant="danger" size="lg" onClick={() => onUndo(ev)}>
              <Undo2 className="w-4 h-4" />
              Undo
            </Button>
          </Row>
        ))}
      </div>

      {undone.length > 0 && (
        <div className="mt-5">
          <div className="text-xs text-muted-fg uppercase tracking-widest mb-2">Undone — tap Redo to put back</div>
          <div className="space-y-2">
            {undone.slice(0, RECENT).map(ev => (
              <Row key={ev.id} game={game} ev={ev} faded>
                {ev.kind === 'quarterScoreRecorded' ? (
                  <span className="text-xs text-muted-fg w-[110px] text-center">Re-record the score</span>
                ) : (
                  <Button variant="secondary" size="lg" onClick={() => onRedo(ev)}>
                    <Redo2 className="w-4 h-4" />
                    Redo
                  </Button>
                )}
              </Row>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ game, ev, faded, children }: { game: Game; ev: GameEvent; faded?: boolean; children: React.ReactNode }) {
  const tint = eventSideTint(ev, game);
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-border bg-surface-hi px-3 py-2 ${faded ? 'opacity-70' : ''}`}
      style={tint ? { borderLeft: `6px solid ${tint}` } : undefined}
    >
      <div className="font-mono text-xs text-muted-fg w-[86px] shrink-0">
        {ev.quarter} · {ev.gameClock}
      </div>
      <div className="flex-1 min-w-0 text-base font-semibold truncate">{describeEvent(ev, game)}</div>
      {children}
    </div>
  );
}
