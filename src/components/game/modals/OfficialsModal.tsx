import { useState } from 'react';
import type { Game, Officials } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { OfficialsForm } from '@/screens/NewGameScreen';
import { useApp } from '@/state/AppProvider';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
}

export function OfficialsModal({ open, game, onClose }: Props) {
  const { dispatch } = useApp();
  const [officials, setOfficials] = useState<Officials>(game.officials ?? {});

  if (!open) return null;

  const apply = () => {
    const cleaned: Officials = Object.fromEntries(
      Object.entries(officials).filter(([, v]) => v && v.trim())
    );
    dispatch({
      type: 'UPDATE_GAME_DETAILS',
      patch: {
        officials: Object.keys(cleaned).length > 0 ? cleaned : undefined
      }
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Game officials"
      subtitle="Recorded on the official scoresheet and the text export."
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
      <OfficialsForm officials={officials} onChange={setOfficials} />
    </Modal>
  );
}
