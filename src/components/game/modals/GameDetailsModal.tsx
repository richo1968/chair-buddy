import { useState } from 'react';
import type { Game } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/state/AppProvider';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
}

export function GameDetailsModal({ open, game, onClose }: Props) {
  const { dispatch } = useApp();
  const [date, setDate] = useState(game.date);
  const [tipTime, setTipTime] = useState(game.tipTime ?? '');
  const [venue, setVenue] = useState(game.venue ?? '');
  const [competition, setCompetition] = useState(game.competition ?? '');
  const [division, setDivision] = useState(game.division);

  if (!open) return null;

  const apply = () => {
    dispatch({
      type: 'UPDATE_GAME_DETAILS',
      patch: {
        date,
        tipTime: tipTime.trim() || undefined,
        venue: venue.trim() || undefined,
        competition: competition.trim() || undefined,
        division: division.trim()
      }
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Game details"
      subtitle="Date, tip-off, venue, division, competition. Edit any time."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base font-mono"
            />
          </Field>
          <Field label="Tip-off time">
            <input
              type="time"
              value={tipTime}
              onChange={e => setTipTime(e.target.value)}
              className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base font-mono"
            />
          </Field>
          <Field label="Venue">
            <input
              type="text"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="e.g. Adelaide Arena"
              className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Competition">
            <input
              type="text"
              value={competition}
              onChange={e => setCompetition(e.target.value)}
              placeholder="e.g. NBL1 Central"
              className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
            />
          </Field>
          <Field label="Division">
            <input
              type="text"
              value={division}
              onChange={e => setDivision(e.target.value)}
              placeholder="e.g. Senior Men A"
              className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-muted-fg mb-1.5">{label}</span>
      {children}
    </label>
  );
}
