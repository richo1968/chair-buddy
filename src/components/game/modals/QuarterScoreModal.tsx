import { useState } from 'react';
import type { Game } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameClockInput, isValidGameClock } from '@/components/GameClockInput';
import { nextQuarter, totalScore } from '@/lib/game';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onCommit: (
    quarterScoreA: number,
    quarterScoreB: number,
    gameClock: string,
    flipArrow: boolean
  ) => void;
}

export function QuarterScoreModal({ open, game, onClose, onCommit }: Props) {
  const existing = game.quarterScores.find(qs => qs.quarter === game.currentQuarter);

  // Cumulative totals from all PRIOR quarters (excluding the current one).
  const prevCumulativeA = totalScore(game, 'A') - (existing?.teamAScore ?? 0);
  const prevCumulativeB = totalScore(game, 'B') - (existing?.teamBScore ?? 0);

  // Pre-fill with the cumulative total at the end of this quarter, if we've
  // already recorded it once.
  const [cumulativeA, setCumulativeA] = useState(
    existing ? String(prevCumulativeA + existing.teamAScore) : ''
  );
  const [cumulativeB, setCumulativeB] = useState(
    existing ? String(prevCumulativeB + existing.teamBScore) : ''
  );
  const [clock, setClock] = useState(game.lastGameClock);
  const [flipArrow, setFlipArrow] = useState(true);

  if (!open) return null;

  const numA = Number(cumulativeA);
  const numB = Number(cumulativeB);

  const filled = cumulativeA.length > 0 && cumulativeB.length > 0;
  const validNumbers =
    Number.isFinite(numA) &&
    Number.isFinite(numB) &&
    numA >= prevCumulativeA &&
    numB >= prevCumulativeB;
  const valid = isValidGameClock(clock) && filled && validNumbers;

  const quarterDeltaA = numA - prevCumulativeA;
  const quarterDeltaB = numB - prevCumulativeB;

  const isHalftime =
    game.currentQuarter === 'Q2' && game.possessionArrow !== null;

  const currentQ = game.currentQuarter;
  const needsTieToAdvance =
    currentQ === 'Q4' || currentQ.startsWith('OT');
  const projectedTied = valid && numA === numB;
  const nextQ = nextQuarter(currentQ);

  let subtitle: string;
  if (filled && !validNumbers) {
    subtitle = `Each total must be ≥ the previous total (${prevCumulativeA}–${prevCumulativeB}).`;
  } else if (!needsTieToAdvance) {
    subtitle = `Enter the cumulative score from the scoreboard. Advances to ${nextQ}.`;
  } else if (!valid) {
    subtitle = `Enter cumulative totals. If tied, advances to ${nextQ} — otherwise the game ends.`;
  } else if (projectedTied) {
    subtitle = `Scores level at ${numA}–${numB}. Will advance to ${nextQ}.`;
  } else {
    subtitle = `${numA}–${numB} — not level. Game will end on commit (no ${nextQ}).`;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Record end of ${currentQ} score`}
      subtitle={subtitle}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() =>
              onCommit(
                quarterDeltaA,
                quarterDeltaB,
                clock,
                isHalftime && flipArrow
              )
            }
          >
            Record &amp; advance
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <GameClockInput value={clock} onChange={setClock} />
        <div className="w-[300px] space-y-4">
          <ScoreField
            label={game.teamA.name || 'Team A'}
            colour={game.teamA.jerseyColour}
            textColour={game.teamA.numberColour}
            value={cumulativeA}
            onChange={setCumulativeA}
            prevCumulative={prevCumulativeA}
            quarterDelta={filled && validNumbers ? quarterDeltaA : null}
          />
          <ScoreField
            label={game.teamB.name || 'Team B'}
            colour={game.teamB.jerseyColour}
            textColour={game.teamB.numberColour}
            value={cumulativeB}
            onChange={setCumulativeB}
            prevCumulative={prevCumulativeB}
            quarterDelta={filled && validNumbers ? quarterDeltaB : null}
          />
        </div>
      </div>

      {isHalftime && (
        <label className="mt-5 flex items-start gap-3 p-3 rounded-2xl bg-surface-hi border border-border cursor-pointer">
          <input
            type="checkbox"
            checked={flipArrow}
            onChange={e => setFlipArrow(e.target.checked)}
            className="w-6 h-6 mt-0.5 accent-accent"
          />
          <div className="min-w-0">
            <div className="font-semibold">
              Flip possession arrow for the second half
            </div>
            <div className="text-xs text-muted-fg">
              Teams change direction in Q3 — the arrow flip is logged as an
              event at the game clock above.
            </div>
          </div>
        </label>
      )}
    </Modal>
  );
}

function ScoreField({
  label,
  colour,
  textColour,
  value,
  onChange,
  prevCumulative,
  quarterDelta
}: {
  label: string;
  colour: string;
  textColour: string;
  value: string;
  onChange: (v: string) => void;
  prevCumulative: number;
  quarterDelta: number | null;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs uppercase tracking-widest font-semibold px-2 py-1 rounded-lg"
          style={{ backgroundColor: colour, color: textColour }}
        >
          {label}
        </span>
        <span className="text-[11px] text-muted-fg tabular-nums">
          was {prevCumulative}
          {quarterDelta !== null && (
            <span className="ml-1 text-accent font-semibold">
              (+{quarterDelta})
            </span>
          )}
        </span>
      </div>
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
