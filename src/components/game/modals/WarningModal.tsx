import { useState } from 'react';
import type { Game, WarningTarget, WarningType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameClockInput, isValidGameClock } from '@/components/GameClockInput';
import { WARNING_TARGET_LABEL, WARNING_TYPE_LABEL } from '@/lib/events';

interface Props {
  open: boolean;
  game: Game;
  target: WarningTarget;
  type: WarningType;
  onClose: () => void;
  onCommit: (note: string | undefined, gameClock: string) => void;
}

export function WarningModal({
  open,
  game,
  target,
  type,
  onClose,
  onCommit
}: Props) {
  const [clock, setClock] = useState(game.lastGameClock);
  const [note, setNote] = useState('');

  if (!open) return null;

  const valid = isValidGameClock(clock);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${WARNING_TYPE_LABEL[type]} — ${WARNING_TARGET_LABEL[target]}`}
      subtitle={`Quarter ${game.currentQuarter}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => onCommit(note.trim() || undefined, clock)}
          >
            Record warning
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <GameClockInput value={clock} onChange={setClock} />
        <div className="w-[280px]">
          <label className="block text-sm text-muted-fg mb-1.5">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Any detail you want to record…"
            rows={5}
            className="w-full rounded-2xl bg-surface-hi border border-border p-3 text-base resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
