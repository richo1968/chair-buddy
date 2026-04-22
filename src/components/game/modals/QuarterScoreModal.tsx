import { useState } from 'react';
import type { Game } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameClockInput, isValidGameClock, ZERO_CLOCK } from '@/components/GameClockInput';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onCommit: (scoreA: number, scoreB: number, gameClock: string) => void;
}

export function QuarterScoreModal({ open, game, onClose, onCommit }: Props) {
  const existing = game.quarterScores.find(qs => qs.quarter === game.currentQuarter);
  const [scoreA, setScoreA] = useState(
    existing ? String(existing.teamAScore) : ''
  );
  const [scoreB, setScoreB] = useState(
    existing ? String(existing.teamBScore) : ''
  );
  const [clock, setClock] = useState(ZERO_CLOCK);

  if (!open) return null;

  const numA = Number(scoreA);
  const numB = Number(scoreB);
  const valid =
    isValidGameClock(clock) &&
    Number.isFinite(numA) &&
    Number.isFinite(numB) &&
    scoreA.length > 0 &&
    scoreB.length > 0 &&
    numA >= 0 &&
    numB >= 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Record ${game.currentQuarter} score`}
      subtitle="Logs the score, advances to the next quarter, and resets the clock to 10:00."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={() => onCommit(numA, numB, clock)}>
            Record &amp; advance
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <GameClockInput value={clock} onChange={setClock} />
        <div className="w-[280px] space-y-4">
          <ScoreField
            label={game.teamA.name || 'Team A'}
            colour={game.teamA.jerseyColour}
            textColour={game.teamA.numberColour}
            value={scoreA}
            onChange={setScoreA}
          />
          <ScoreField
            label={game.teamB.name || 'Team B'}
            colour={game.teamB.jerseyColour}
            textColour={game.teamB.numberColour}
            value={scoreB}
            onChange={setScoreB}
          />
        </div>
      </div>
    </Modal>
  );
}

function ScoreField({
  label,
  colour,
  textColour,
  value,
  onChange
}: {
  label: string;
  colour: string;
  textColour: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span
        className="block text-xs uppercase tracking-widest font-semibold mb-1 px-2 py-1 rounded-lg w-fit"
        style={{ backgroundColor: colour, color: textColour }}
      >
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="0"
        className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-3xl font-mono font-bold text-center"
      />
    </label>
  );
}
