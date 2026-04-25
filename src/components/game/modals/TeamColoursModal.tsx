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
  const [coachName, setCoachName] = useState(team.coachName ?? '');
  const [assistantCoachName, setAssistantCoachName] = useState(
    team.assistantCoachName ?? ''
  );

  if (!open) return null;

  const apply = () => {
    dispatch({
      type: 'UPDATE_TEAM',
      side,
      patch: {
        name: name.trim(),
        jerseyColour: jersey,
        numberColour: number,
        coachName: coachName.trim() || undefined,
        assistantCoachName: assistantCoachName.trim() || undefined
      }
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Team ${side} — details`}
      subtitle="Name, colours, and coaching staff."
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm text-muted-fg mb-1.5">
                Head coach
              </span>
              <input
                type="text"
                value={coachName}
                onChange={e => setCoachName(e.target.value)}
                placeholder="e.g. M. Smith"
                className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-muted-fg mb-1.5">
                Assistant coach
              </span>
              <input
                type="text"
                value={assistantCoachName}
                onChange={e => setAssistantCoachName(e.target.value)}
                placeholder="e.g. R. Jones"
                className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
              />
            </label>
          </div>
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
