import { useState } from 'react';
import { Square, AlertTriangle, Clock } from 'lucide-react';
import type { Game, Quarter, Side } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  GameClockInput,
  isValidGameClock
} from '@/components/GameClockInput';
import { timeoutStatus } from '@/lib/game';

interface Props {
  open: boolean;
  game: Game;
  side: Side;
  onClose: () => void;
  onCommit: (gameClock: string, forfeited: boolean) => void;
  onCancelTimer: () => void;
  /** When set, this timeout is being logged retroactively into a past quarter.
   *  No live timer is running in this mode. */
  quarter?: Quarter;
}

export function TimeoutModal({
  open,
  game,
  side,
  onClose,
  onCommit,
  onCancelTimer,
  quarter
}: Props) {
  const team = side === 'A' ? game.teamA : game.teamB;
  const isPastEntry = quarter !== undefined && quarter !== game.currentQuarter;
  const displayQuarter = quarter ?? game.currentQuarter;
  const [clock, setClock] = useState(isPastEntry ? '10:00' : game.lastGameClock);

  if (!open) return null;

  const valid = isValidGameClock(clock);
  const status = timeoutStatus(game, side, quarter);
  const isQ4 = displayQuarter === 'Q4';

  return (
    <Modal
      open={open}
      onClose={() => {
        onCancelTimer();
        onClose();
      }}
      title={
        <span>
          Timeout — {team.name || `Team ${side}`}{' '}
          <span
            className="ml-1 px-2 py-0.5 rounded-md text-xs font-bold tracking-widest uppercase"
            style={{
              backgroundColor: team.jerseyColour,
              color: team.numberColour
            }}
          >
            T/O
          </span>
        </span>
      }
      subtitle={
        isPastEntry
          ? `Past entry · ${displayQuarter} — ${status.phaseLabel}, ${status.used} of ${status.max} used.`
          : `${status.phaseLabel} — ${status.used} of ${status.max} used. Timer is running.`
      }
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              onCancelTimer();
              onClose();
            }}
          >
            Cancel &amp; stop timer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <GameClockInput value={clock} onChange={setClock} />
        <div className="w-[300px] space-y-3">
          <Button
            disabled={!valid}
            size="xl"
            className="w-full"
            onClick={() => onCommit(clock, false)}
          >
            <Clock className="w-5 h-5" />
            Record timeout
          </Button>
          {isQ4 && (
            <Button
              disabled={!valid}
              size="xl"
              variant="secondary"
              className="w-full"
              onClick={() => {
                onCancelTimer();
                onCommit(clock, true);
              }}
            >
              <AlertTriangle className="w-5 h-5" />
              Forfeit timeout
            </Button>
          )}
          {!isPastEntry && (
            <div className="text-xs text-muted-fg pt-2 leading-relaxed">
              <div className="flex items-start gap-2">
                <Square className="w-3 h-3 mt-0.5 shrink-0" />
                <div>
                  The 1-minute timer started when you tapped the Timeout button.
                  Cancelling or forfeiting will stop the timer.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
