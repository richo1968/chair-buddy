import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type {
  FoulEvent,
  FoulType,
  Game,
  GameEvent,
  PossessionChangeEvent,
  QuarterScoreRecordedEvent,
  Side,
  WarningEvent
} from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  GameClockInput,
  isValidGameClock
} from '@/components/GameClockInput';
import { FOUL_TYPE_LABEL, describeEvent } from '@/lib/events';
import { useApp } from '@/state/AppProvider';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  game: Game;
  event: GameEvent | null;
  onClose: () => void;
}

export function EditEventModal({ open, game, event, onClose }: Props) {
  const { dispatch } = useApp();
  const [clock, setClock] = useState(event?.gameClock ?? '00:00');
  const [foulType, setFoulType] = useState<FoulType | null>(
    event?.kind === 'foul' ? event.type : null
  );
  const [possession, setPossession] = useState<Side | null>(
    event?.kind === 'possessionChange' ? event.newDirection : null
  );
  const [scoreA, setScoreA] = useState(
    event?.kind === 'quarterScoreRecorded' ? String(event.teamAScore) : ''
  );
  const [scoreB, setScoreB] = useState(
    event?.kind === 'quarterScoreRecorded' ? String(event.teamBScore) : ''
  );
  const [note, setNote] = useState(
    event?.kind === 'warning' ? event.note ?? '' : ''
  );

  if (!open || !event) return null;

  const valid = isValidGameClock(clock);

  const save = () => {
    if (!valid) return;
    if (event.kind === 'foul' && foulType) {
      dispatch({
        type: 'UPDATE_EVENT',
        eventId: event.id,
        patch: { gameClock: clock, type: foulType } as Partial<FoulEvent>
      });
    } else if (event.kind === 'possessionChange' && possession) {
      dispatch({
        type: 'UPDATE_EVENT',
        eventId: event.id,
        patch: {
          gameClock: clock,
          newDirection: possession
        } as Partial<PossessionChangeEvent>
      });
    } else if (event.kind === 'warning') {
      dispatch({
        type: 'UPDATE_EVENT',
        eventId: event.id,
        patch: {
          gameClock: clock,
          note: note.trim() || undefined
        } as Partial<WarningEvent>
      });
    } else if (event.kind === 'quarterScoreRecorded') {
      const a = Number(scoreA);
      const b = Number(scoreB);
      if (Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= 0) {
        dispatch({
          type: 'UPDATE_EVENT',
          eventId: event.id,
          patch: {
            gameClock: clock,
            teamAScore: a,
            teamBScore: b
          } as Partial<QuarterScoreRecordedEvent>
        });
        dispatch({
          type: 'UPDATE_QUARTER_SCORE',
          quarter: event.quarterScored,
          teamAScore: a,
          teamBScore: b
        });
      }
    } else {
      dispatch({
        type: 'UPDATE_EVENT',
        eventId: event.id,
        patch: { gameClock: clock }
      });
    }
    onClose();
  };

  const del = () => {
    dispatch({ type: 'DELETE_EVENT', eventId: event.id });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit event"
      subtitle={describeEvent(event, game)}
      size="lg"
      footer={
        <>
          <Button variant="danger" onClick={del}>
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <GameClockInput value={clock} onChange={setClock} />
        <div className="w-[280px] space-y-3">
          {event.kind === 'foul' && (
            <div className="space-y-2">
              <div className="text-sm text-muted-fg">Foul type</div>
              {(
                (event.on.kind === 'player'
                  ? ['personal', 'technical', 'unsportsmanlike', 'disqualifying']
                  : ['technical']) as FoulType[]
              ).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFoulType(t)}
                  className={cn(
                    'w-full rounded-2xl border-2 px-3 py-3 text-base font-semibold text-left',
                    'active:brightness-110 transition-none',
                    foulType === t
                      ? 'border-accent bg-surface-hi'
                      : 'border-border bg-surface'
                  )}
                >
                  {FOUL_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          )}

          {event.kind === 'possessionChange' && (
            <div className="space-y-2">
              <div className="text-sm text-muted-fg">Possession to</div>
              {(['A', 'B'] as Side[]).map(s => {
                const team = s === 'A' ? game.teamA : game.teamB;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPossession(s)}
                    className={cn(
                      'w-full rounded-2xl border-2 px-3 py-3 text-left',
                      'active:brightness-110 transition-none',
                      possession === s ? 'border-accent' : 'border-border'
                    )}
                    style={{
                      backgroundColor: team.jerseyColour,
                      color: team.numberColour
                    }}
                  >
                    <div className="text-xl font-bold">
                      {team.name || `Team ${s}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {event.kind === 'warning' && (
            <label className="block">
              <span className="block text-sm text-muted-fg mb-1.5">Note</span>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={5}
                className="w-full rounded-2xl bg-surface-hi border border-border p-3 text-base resize-none"
              />
            </label>
          )}

          {event.kind === 'quarterScoreRecorded' && (
            <div className="space-y-3">
              <label className="block">
                <span
                  className="block text-xs uppercase tracking-widest font-semibold mb-1 px-2 py-1 rounded-lg w-fit"
                  style={{
                    backgroundColor: game.teamA.jerseyColour,
                    color: game.teamA.numberColour
                  }}
                >
                  {game.teamA.name || 'Team A'}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={scoreA}
                  onChange={e => setScoreA(e.target.value.replace(/\D/g, ''))}
                  className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-2xl font-mono font-bold text-center"
                />
              </label>
              <label className="block">
                <span
                  className="block text-xs uppercase tracking-widest font-semibold mb-1 px-2 py-1 rounded-lg w-fit"
                  style={{
                    backgroundColor: game.teamB.jerseyColour,
                    color: game.teamB.numberColour
                  }}
                >
                  {game.teamB.name || 'Team B'}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={scoreB}
                  onChange={e => setScoreB(e.target.value.replace(/\D/g, ''))}
                  className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-2xl font-mono font-bold text-center"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
