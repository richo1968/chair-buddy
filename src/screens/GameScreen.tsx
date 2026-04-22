import { useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  BookOpenCheck,
  Flag,
  Moon,
  Sun
} from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TeamPanel } from '@/components/game/TeamPanel';
import { PossessionArrow } from '@/components/game/PossessionArrow';
import { QuarterScoresTable } from '@/components/game/QuarterScoresTable';
import { EventLog } from '@/components/game/EventLog';
import { WarningsGrid } from '@/components/game/WarningsGrid';
import { FoulModal } from '@/components/game/modals/FoulModal';
import { WarningModal } from '@/components/game/modals/WarningModal';
import { PossessionModal } from '@/components/game/modals/PossessionModal';
import { QuarterScoreModal } from '@/components/game/modals/QuarterScoreModal';
import { PlayersModal } from '@/components/game/modals/PlayersModal';
import { TeamColoursModal } from '@/components/game/modals/TeamColoursModal';
import { EditEventModal } from '@/components/game/modals/EditEventModal';
import { newId } from '@/lib/game';
import type {
  FoulSubject,
  FoulType,
  GameEvent,
  Side,
  WarningTarget,
  WarningType
} from '@/types';

type FoulTarget = { side: Side; subject: FoulSubject };

export function GameScreen() {
  const { dispatch, activeGame } = useApp();
  const [theme, toggleTheme] = useTheme();

  const [foulTarget, setFoulTarget] = useState<FoulTarget | null>(null);
  const [warningType, setWarningType] = useState<WarningType | null>(null);
  const [possessionOpen, setPossessionOpen] = useState(false);
  const [quarterScoreOpen, setQuarterScoreOpen] = useState(false);
  const [playersSide, setPlayersSide] = useState<Side | null>(null);
  const [coloursSide, setColoursSide] = useState<Side | null>(null);
  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  const [endGameConfirm, setEndGameConfirm] = useState(false);

  if (!activeGame) return null;

  const leftSide: Side = activeGame.layout === 'A-left' ? 'A' : 'B';
  const rightSide: Side = leftSide === 'A' ? 'B' : 'A';

  const logFoul = (type: FoulType, gameClock: string) => {
    if (!foulTarget) return;
    const event: GameEvent = {
      id: newId(),
      kind: 'foul',
      quarter: activeGame.currentQuarter,
      gameClock,
      wallTimestamp: Date.now(),
      team: foulTarget.side,
      on: foulTarget.subject,
      type
    };
    dispatch({ type: 'ADD_EVENT', event });
    setFoulTarget(null);
  };

  const logWarning = (
    target: WarningTarget,
    note: string | undefined,
    gameClock: string
  ) => {
    if (!warningType) return;
    const event: GameEvent = {
      id: newId(),
      kind: 'warning',
      quarter: activeGame.currentQuarter,
      gameClock,
      wallTimestamp: Date.now(),
      target,
      warningType,
      note
    };
    dispatch({ type: 'ADD_EVENT', event });
    setWarningType(null);
  };

  const logPossession = (newDirection: Side, gameClock: string | null) => {
    if (gameClock === null) {
      dispatch({ type: 'SET_POSSESSION', arrow: newDirection });
    } else {
      const event: GameEvent = {
        id: newId(),
        kind: 'possessionChange',
        quarter: activeGame.currentQuarter,
        gameClock,
        wallTimestamp: Date.now(),
        newDirection
      };
      dispatch({ type: 'ADD_EVENT', event });
    }
    setPossessionOpen(false);
  };

  const recordQuarterScore = (
    a: number,
    b: number,
    gameClock: string,
    flipArrow: boolean
  ) => {
    dispatch({
      type: 'RECORD_QUARTER_SCORE',
      gameClock,
      teamAScore: a,
      teamBScore: b
    });
    if (flipArrow && activeGame.possessionArrow) {
      const flipped: Side = activeGame.possessionArrow === 'A' ? 'B' : 'A';
      const event: GameEvent = {
        id: newId(),
        kind: 'possessionChange',
        quarter: activeGame.currentQuarter,
        gameClock,
        wallTimestamp: Date.now(),
        newDirection: flipped
      };
      dispatch({ type: 'ADD_EVENT', event });
    }
    setQuarterScoreOpen(false);
  };

  return (
    <div className="h-full w-full bg-bg text-fg flex flex-col overflow-hidden">
      <header className="shrink-0 px-4 py-2 border-b border-border bg-surface flex items-center gap-3">
        <Button
          variant="ghost"
          size="md"
          onClick={() => dispatch({ type: 'GO_HOME' })}
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-fg">
            {activeGame.date}
            {activeGame.division && ` · ${activeGame.division}`}
          </div>
          <div className="text-base font-bold truncate">
            {activeGame.teamA.name || 'Team A'}{' '}
            <span className="text-muted-fg">vs</span>{' '}
            {activeGame.teamB.name || 'Team B'}
          </div>
        </div>
        <div className="text-xs text-muted-fg mr-2 font-mono tabular-nums">
          last clock {activeGame.lastGameClock}
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => dispatch({ type: 'SWAP_BENCHES' })}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Swap
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => dispatch({ type: 'OPEN_REVIEW', id: activeGame.id })}
        >
          <BookOpenCheck className="w-4 h-4" />
          Review
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={() => setEndGameConfirm(true)}
        >
          <Flag className="w-4 h-4" />
          End Game
        </Button>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-[minmax(280px,1fr)_minmax(480px,1.4fr)_minmax(280px,1fr)] gap-3 p-3">
        <TeamPanel
          game={activeGame}
          side={leftSide}
          onFoulSubject={subject =>
            setFoulTarget({ side: leftSide, subject })
          }
          onOpenPlayers={() => setPlayersSide(leftSide)}
          onOpenColours={() => setColoursSide(leftSide)}
        />

        <section className="flex flex-col gap-3 min-h-0">
          <div className="rounded-2xl border border-border bg-surface px-4 py-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-fg">
                Current quarter
              </div>
              <div className="text-2xl font-bold font-mono">
                {activeGame.currentQuarter}
              </div>
            </div>
            <Button size="md" onClick={() => setQuarterScoreOpen(true)}>
              Record {activeGame.currentQuarter} score
            </Button>
          </div>

          <PossessionArrow
            game={activeGame}
            onTap={() => setPossessionOpen(true)}
          />

          <QuarterScoresTable
            game={activeGame}
            onEditQuarter={quarter => {
              const ev = activeGame.events.find(
                e => e.kind === 'quarterScoreRecorded' && e.quarterScored === quarter
              );
              if (ev) setEditingEvent(ev);
            }}
          />

          <div className="flex-1 min-h-0">
            <EventLog game={activeGame} onEventTap={setEditingEvent} />
          </div>

          <WarningsGrid onTap={type => setWarningType(type)} />
        </section>

        <TeamPanel
          game={activeGame}
          side={rightSide}
          onFoulSubject={subject =>
            setFoulTarget({ side: rightSide, subject })
          }
          onOpenPlayers={() => setPlayersSide(rightSide)}
          onOpenColours={() => setColoursSide(rightSide)}
        />
      </main>

      {foulTarget && (
        <FoulModal
          open={true}
          game={activeGame}
          side={foulTarget.side}
          subject={foulTarget.subject}
          onClose={() => setFoulTarget(null)}
          onCommit={logFoul}
        />
      )}
      {warningType && (
        <WarningModal
          open={true}
          game={activeGame}
          type={warningType}
          onClose={() => setWarningType(null)}
          onCommit={logWarning}
        />
      )}
      <PossessionModal
        open={possessionOpen}
        game={activeGame}
        onClose={() => setPossessionOpen(false)}
        onCommit={logPossession}
      />
      <QuarterScoreModal
        open={quarterScoreOpen}
        game={activeGame}
        onClose={() => setQuarterScoreOpen(false)}
        onCommit={recordQuarterScore}
      />
      {playersSide && (
        <PlayersModal
          open={true}
          game={activeGame}
          side={playersSide}
          onClose={() => setPlayersSide(null)}
        />
      )}
      {coloursSide && (
        <TeamColoursModal
          open={true}
          game={activeGame}
          side={coloursSide}
          onClose={() => setColoursSide(null)}
        />
      )}
      <EditEventModal
        open={!!editingEvent}
        game={activeGame}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
      />
      <ConfirmDialog
        open={endGameConfirm}
        title="End this game?"
        message="The game will be marked Final and open in read-only review mode. You can reopen it later if needed."
        confirmLabel="End game"
        danger
        onCancel={() => setEndGameConfirm(false)}
        onConfirm={() => {
          setEndGameConfirm(false);
          dispatch({ type: 'FINISH_GAME' });
          dispatch({ type: 'OPEN_REVIEW', id: activeGame.id });
        }}
      />
    </div>
  );
}
