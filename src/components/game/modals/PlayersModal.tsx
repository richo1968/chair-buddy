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
      <div className="space-y-5">
      {/* Coaching staff — editable mid-game from the same modal that opens
          via 'Manage players'. The team-header pencil button still opens
          the colours/details modal which also has these fields, but having
          them here too means the chair never has to hunt for them. */}
      <div className="rounded-2xl border border-border bg-surface-hi p-4 space-y-3">
        <div className="text-xs uppercase tracking-widest text-muted-fg font-semibold">
          Coaching staff
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm text-muted-fg mb-1.5">Head coach</span>
            <input
              type="text"
              value={team.coachName ?? ''}
              onChange={e =>
                dispatch({
                  type: 'UPDATE_TEAM',
                  side,
                  patch: { coachName: e.target.value || undefined }
                })
              }
              placeholder="e.g. M. Smith"
              className="h-12 w-full rounded-xl bg-surface border border-border px-3 text-base"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-muted-fg mb-1.5">
              Assistant coach
            </span>
            <input
              type="text"
              value={team.assistantCoachName ?? ''}
              onChange={e =>
                dispatch({
                  type: 'UPDATE_TEAM',
                  side,
                  patch: { assistantCoachName: e.target.value || undefined }
                })
              }
              placeholder="e.g. R. Jones"
              className="h-12 w-full rounded-xl bg-surface border border-border px-3 text-base"
            />
          </label>
        </div>
      </div>

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
      </div>
    </Modal>
  );
}
