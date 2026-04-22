import { useState } from 'react';
import type { Game, Side } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ColourSwatchPicker } from '@/components/ColourSwatchPicker';
import { JerseyPreview } from '@/components/JerseyPreview';
import { useApp } from '@/state/AppProvider';

interface Props {
  open: boolean;
  game: Game;
  side: Side;
  onClose: () => void;
}

export function TeamColoursModal({ open, game, side, onClose }: Props) {
  const { dispatch } = useApp();
  const team = side === 'A' ? game.teamA : game.teamB;

  const [name, setName] = useState(team.name);
  const [jersey, setJersey] = useState(team.jerseyColour);
  const [number, setNumber] = useState(team.numberColour);

  if (!open) return null;

  const apply = () => {
    dispatch({
      type: 'UPDATE_TEAM',
      side,
      patch: {
        name: name.trim(),
        jerseyColour: jersey,
        numberColour: number
      }
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Team ${side} — name and colours`}
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
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-5">
          <label className="block">
            <span className="block text-sm text-muted-fg mb-1.5">Team name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-lg"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-muted-fg mb-1.5">Jersey colour</span>
            <ColourSwatchPicker value={jersey} onChange={setJersey} />
          </label>
          <label className="block">
            <span className="block text-sm text-muted-fg mb-1.5">Number colour</span>
            <ColourSwatchPicker value={number} onChange={setNumber} />
          </label>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-fg">Preview</span>
          <JerseyPreview
            jerseyColour={jersey}
            numberColour={number}
            number={team.players[0]?.number || '7'}
            size="lg"
          />
        </div>
      </div>
    </Modal>
  );
}
