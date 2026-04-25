import type { Game, Side } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PlayerEditor } from '@/components/PlayerEditor';
import { useApp } from '@/state/AppProvider';

interface Props {
  open: boolean;
  game: Game;
  side: Side;
  onClose: () => void;
}

export function PlayersModal({ open, game, side, onClose }: Props) {
  const { dispatch } = useApp();
  const team = side === 'A' ? game.teamA : game.teamB;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Manage players — ${team.name || `Team ${side}`}`}
      subtitle="Fouls follow the player ID, so renumbering preserves history."
      size="lg"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <PlayerEditor
        players={team.players}
        accent={team.jerseyColour}
        captainId={team.captainId}
        onCaptainChange={id =>
          dispatch({ type: 'SET_CAPTAIN', side, playerId: id })
        }
        onChange={next => {
          const prev = team.players;
          const prevIds = new Set(prev.map(p => p.id));
          const nextIds = new Set(next.map(p => p.id));

          for (const id of prevIds) {
            if (!nextIds.has(id)) {
              dispatch({ type: 'DELETE_PLAYER', side, playerId: id });
            }
          }
          for (const p of next) {
            if (!prevIds.has(p.id)) {
              dispatch({ type: 'ADD_PLAYER', side, player: p });
            } else {
              const before = prev.find(x => x.id === p.id);
              if (
                before &&
                (before.number !== p.number || before.name !== p.name)
              ) {
                dispatch({
                  type: 'UPDATE_PLAYER',
                  side,
                  playerId: p.id,
                  patch: { number: p.number, name: p.name }
                });
              }
            }
          }
        }}
      />
    </Modal>
  );
}
