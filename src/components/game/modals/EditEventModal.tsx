import { useState } from 'react';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import type {
  ArrowDirection,
  FoulEvent,
  FoulType,
  Game,
  GameEvent,
  PossessionChangeEvent,
  ProtestEvent,
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
    event?.kind === 'possessionChange' ? event.newTeam : null
  );
  const [arrowDir, setArrowDir] = useState<ArrowDirection | null>(
    event?.kind === 'possessionChange' ? event.newArrowDirection : null
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
  const [protestReason, setProtestReason] = useState(
    event?.kind === 'protest' ? event.reason ?? '' : ''
  );
  const [ftAttempted, setFtAttempted] = useState(
    event?.kind === 'foul' && event.freeThrows
      ? String(event.freeThrows.attempted)
      : ''
  );
  const [ftMade, setFtMade] = useState(
    event?.kind === 'foul' && event.freeThrows
      ? String(event.freeThrows.made)
      : ''
  );

  if (!open || !event) return null;

  const valid = isValidGameClock(clock);

  const save = () => {
    if (!valid) return;
    if (event.kind === 'foul' && foulType) {
      const ftAtt = parseInt(ftAttempted, 10);
      const ftMd = parseInt(ftMade, 10);
      const ftHasInput = ftAttempted.length > 0 || ftMade.length > 0;
      const ftValid =
        ftHasInput &&
        Number.isFinite(ftAtt) &&
        Number.isFinite(ftMd) &&
        ftAtt >= 0 &&
        ftMd >= 0 &&
        ftMd <= ftAtt;
      const patch: Partial<FoulEvent> = {
        gameClock: clock,
        type: foulType,
        freeThrows: ftValid
          ? { attempted: ftAtt, made: ftMd }
          : undefined
      };
      dispatch({
        type: 'UPDATE_EVENT',
        eventId: event.id,
        patch
      });
    } else if (event.kind === 'possessionChange' && possession && arrowDir) {
      dispatch({
        type: 'UPDATE_EVENT',
        eventId: event.id,
        patch: {
          gameClock: clock,
          newTeam: possession,
          newArrowDirection: arrowDir
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
    } else if (event.kind === 'protest') {
      dispatch({
        type: 'UPDATE_EVENT',
        eventId: event.id,
        patch: {
          gameClock: clock,
          reason: protestReason.trim() || event.reason
        } as Partial<ProtestEvent>
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
            <div className="space-y-3">
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
              <div className="rounded-xl border border-border bg-surface px-3 py-2 space-y-2">
                <div className="text-xs text-muted-fg uppercase tracking-widest">
                  Free throws (optional)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-[10px] text-muted-fg mb-0.5">
                      Attempted
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ftAttempted}
                      onChange={e =>
                        setFtAttempted(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="0"
                      className="h-10 w-full rounded-lg bg-surface-hi border border-border px-2 text-center font-mono text-base"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] text-muted-fg mb-0.5">
                      Made
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ftMade}
                      onChange={e =>
                        setFtMade(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="0"
                      className="h-10 w-full rounded-lg bg-surface-hi border border-border px-2 text-center font-mono text-base"
                    />
                  </label>
                </div>
                <div className="text-[10px] text-muted-fg leading-relaxed">
                  Leave blank to clear FT info.
                </div>
              </div>
            </div>
          )}

          {event.kind === 'possessionChange' && (
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-fg mb-1.5">Arrow direction</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setArrowDir('left')}
                    className={cn(
                      'rounded-2xl border-2 bg-black text-danger py-3 flex items-center justify-center gap-1',
                      'active:brightness-110 transition-none',
                      arrowDir === 'left' ? 'border-accent' : 'border-danger/60'
                    )}
                  >
                    <ArrowLeft className="w-6 h-6" strokeWidth={3} />
                    <span className="text-xs font-bold uppercase">Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setArrowDir('right')}
                    className={cn(
                      'rounded-2xl border-2 bg-black text-danger py-3 flex items-center justify-center gap-1',
                      'active:brightness-110 transition-none',
                      arrowDir === 'right' ? 'border-accent' : 'border-danger/60'
                    )}
                  >
                    <span className="text-xs font-bold uppercase">Right</span>
                    <ArrowRight className="w-6 h-6" strokeWidth={3} />
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-fg mb-1.5">Possession to</div>
                <div className="space-y-2">
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
                        <div className="text-lg font-bold">
                          {team.name || `Team ${s}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
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

          {event.kind === 'protest' && (
            <label className="block">
              <span className="block text-sm text-muted-fg mb-1.5">
                Protest reason
              </span>
              <textarea
                value={protestReason}
                onChange={e => setProtestReason(e.target.value)}
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
