import { useEffect, useState } from 'react';
import {
  AlertOctagon,
  ArrowLeft,
  ArrowLeftRight,
  BookOpenCheck,
  Flag,
  History,
  Moon,
  Settings,
  Sun,
  UserSquare
} from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { TeamPanel } from '@/components/game/TeamPanel';
import { PossessionArrow } from '@/components/game/PossessionArrow';
import { QuarterScoresTable } from '@/components/game/QuarterScoresTable';
import { WarningsGrid } from '@/components/game/WarningsGrid';
import { TimeoutTimer } from '@/components/game/TimeoutTimer';
import { FoulModal } from '@/components/game/modals/FoulModal';
import { WarningModal } from '@/components/game/modals/WarningModal';
import { PossessionModal } from '@/components/game/modals/PossessionModal';
import { QuarterScoreModal } from '@/components/game/modals/QuarterScoreModal';
import { TimeoutModal } from '@/components/game/modals/TimeoutModal';
import { PlayersModal } from '@/components/game/modals/PlayersModal';
import { TeamColoursModal } from '@/components/game/modals/TeamColoursModal';
import { EditEventModal } from '@/components/game/modals/EditEventModal';
import { EndGameModal } from '@/components/game/modals/EndGameModal';
import { OfficialsModal } from '@/components/game/modals/OfficialsModal';
import { GameDetailsModal } from '@/components/game/modals/GameDetailsModal';
import { ProtestModal } from '@/components/game/modals/ProtestModal';
import { PastQuarterModal } from '@/components/game/modals/PastQuarterModal';
import type { PastEntryResult } from '@/components/game/modals/PastQuarterModal';
import { newId, previousQuarters } from '@/lib/game';
import type {
  ArrowDirection,
  FoulSubject,
  FoulType,
  FreeThrows,
  GameEvent,
  GameOutcome,
  PossessionReason,
  Quarter,
  Side,
  WarningTarget,
  WarningType
} from '@/types';

type FoulTarget = { side: Side; subject: FoulSubject };
type ActiveTimeout = { team: Side; startedAt: number };

const LOG_RATIO_KEY = 'scoretable-chair:logRatio';
const clampRatio = (v: number) => Math.min(0.85, Math.max(0.1, v));

export function GameScreen() {
  const { dispatch, activeGame } = useApp();
  const [theme, toggleTheme] = useTheme();

  const [foulTarget, setFoulTarget] = useState<FoulTarget | null>(null);
  const [warningType, setWarningType] = useState<WarningType | null>(null);
  const [possessionOpen, setPossessionOpen] = useState(false);
  const [quarterScoreOpen, setQuarterScoreOpen] = useState(false);
  const [timeoutSide, setTimeoutSide] = useState<Side | null>(null);
  const [activeTimeout, setActiveTimeout] = useState<ActiveTimeout | null>(null);
  const [playersSide, setPlayersSide] = useState<Side | null>(null);
  const [coloursSide, setColoursSide] = useState<Side | null>(null);
  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  const [endGameOpen, setEndGameOpen] = useState(false);
  const [officialsOpen, setOfficialsOpen] = useState(false);
  const [gameDetailsOpen, setGameDetailsOpen] = useState(false);
  const [protestOpen, setProtestOpen] = useState(false);
  const [pastQuarterOpen, setPastQuarterOpen] = useState(false);
  /** When set, the next foul/warning/timeout/protest entry is logged into this
   *  past quarter instead of the current one. Cleared on commit or cancel. */
  const [pastQuarterTarget, setPastQuarterTarget] = useState<Quarter | null>(null);

  // Persisted UI preference: ratio of the team-panel split between player
  // grid (top) and event log (bottom). Shared across both teams so the layout
  // stays symmetric. Range: 0.1 (tiny log) … 0.85 (tiny grid).
  const [logRatio, setLogRatio] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.4;
    const raw = window.localStorage.getItem(LOG_RATIO_KEY);
    const parsed = raw ? parseFloat(raw) : NaN;
    return isNaN(parsed) ? 0.4 : clampRatio(parsed);
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOG_RATIO_KEY, String(logRatio));
    }
  }, [logRatio]);

  if (!activeGame) return null;

  const leftSide: Side = activeGame.layout === 'A-left' ? 'A' : 'B';
  const rightSide: Side = leftSide === 'A' ? 'B' : 'A';

  const eventQuarter = (): Quarter =>
    pastQuarterTarget ?? activeGame.currentQuarter;

  const clearPastTarget = () => setPastQuarterTarget(null);

  const logFoul = (
    type: FoulType,
    gameClock: string,
    freeThrows: FreeThrows | undefined
  ) => {
    if (!foulTarget) return;
    const event: GameEvent = {
      id: newId(),
      kind: 'foul',
      quarter: eventQuarter(),
      gameClock,
      wallTimestamp: Date.now(),
      team: foulTarget.side,
      on: foulTarget.subject,
      type,
      ...(freeThrows ? { freeThrows } : {})
    };
    dispatch({ type: 'ADD_EVENT', event });
    setFoulTarget(null);
    clearPastTarget();
  };

  const logProtest = (team: Side, reason: string, gameClock: string) => {
    const event: GameEvent = {
      id: newId(),
      kind: 'protest',
      quarter: eventQuarter(),
      gameClock,
      wallTimestamp: Date.now(),
      team,
      reason
    };
    dispatch({ type: 'ADD_EVENT', event });
    setProtestOpen(false);
    clearPastTarget();
  };

  const handleEndGame = (outcome: GameOutcome) => {
    setEndGameOpen(false);
    dispatch({ type: 'FINISH_GAME', outcome });
    dispatch({ type: 'OPEN_REVIEW', id: activeGame.id });
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
      quarter: eventQuarter(),
      gameClock,
      wallTimestamp: Date.now(),
      target,
      warningType,
      note
    };
    dispatch({ type: 'ADD_EVENT', event });
    setWarningType(null);
    clearPastTarget();
  };

  const logPossession = (
    newTeam: Side,
    newArrowDirection: ArrowDirection,
    gameClock: string | null,
    reason: PossessionReason | null
  ) => {
    if (gameClock === null) {
      dispatch({
        type: 'INITIAL_POSSESSION',
        team: newTeam,
        direction: newArrowDirection
      });
    } else {
      const event: GameEvent = {
        id: newId(),
        kind: 'possessionChange',
        quarter: activeGame.currentQuarter,
        gameClock,
        wallTimestamp: Date.now(),
        newTeam,
        newArrowDirection,
        ...(reason ? { reason } : {})
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
    if (flipArrow && activeGame.possessionArrow && activeGame.arrowDirection) {
      const flippedDirection: ArrowDirection =
        activeGame.arrowDirection === 'left' ? 'right' : 'left';
      const event: GameEvent = {
        id: newId(),
        kind: 'possessionChange',
        quarter: activeGame.currentQuarter,
        gameClock,
        wallTimestamp: Date.now(),
        newTeam: activeGame.possessionArrow,
        newArrowDirection: flippedDirection,
        halftimeFlip: true
      };
      dispatch({ type: 'ADD_EVENT', event });
    }
    setQuarterScoreOpen(false);
  };

  const startTimeout = (side: Side) => {
    setActiveTimeout({ team: side, startedAt: Date.now() });
    setTimeoutSide(side);
  };

  const logTimeout = (gameClock: string, forfeited: boolean) => {
    if (timeoutSide === null) return;
    const event: GameEvent = {
      id: newId(),
      kind: 'timeout',
      quarter: eventQuarter(),
      gameClock,
      wallTimestamp: Date.now(),
      team: timeoutSide,
      forfeited
    };
    dispatch({ type: 'ADD_EVENT', event });
    if (forfeited) setActiveTimeout(null);
    setTimeoutSide(null);
    clearPastTarget();
  };

  const cancelTimeoutTimer = () => {
    setActiveTimeout(null);
  };

  const activeTimeoutTeamInfo =
    activeTimeout === null
      ? null
      : activeTimeout.team === 'A'
        ? activeGame.teamA
        : activeGame.teamB;

  const handlePastEntryPick = (result: PastEntryResult) => {
    setPastQuarterOpen(false);
    setPastQuarterTarget(result.quarter);
    if (result.kind === 'foul') {
      setFoulTarget({ side: result.side, subject: result.subject });
    } else if (result.kind === 'warning') {
      setWarningType(result.warningType);
    } else if (result.kind === 'timeout') {
      // Retroactive — do NOT start the live 1-minute timer.
      setTimeoutSide(result.side);
    } else if (result.kind === 'protest') {
      setProtestOpen(true);
    }
  };

  const hasPreviousQuarters =
    previousQuarters(activeGame.currentQuarter).length > 0;

  return (
    <div className="h-full w-full bg-bg text-fg flex flex-col overflow-hidden">
      <header className="shrink-0 px-4 pt-safe-2 pb-2 border-b border-border bg-surface flex items-center gap-3">
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
          aria-label="Swap benches"
          title="Swap benches"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setGameDetailsOpen(true)}
          aria-label="Game details"
          title="Edit date / venue / competition"
        >
          <Settings className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setOfficialsOpen(true)}
          aria-label="Officials"
          title="Edit table officials"
        >
          <UserSquare className="w-4 h-4" />
        </Button>
        {hasPreviousQuarters && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => setPastQuarterOpen(true)}
            aria-label="Add to a past quarter"
            title="Add a missed event to a previous quarter"
          >
            <History className="w-4 h-4" />
            Past Q
          </Button>
        )}
        <Button
          variant="secondary"
          size="md"
          onClick={() => setProtestOpen(true)}
          aria-label="Log protest"
          title="Log a team protest"
        >
          <AlertOctagon className="w-4 h-4 text-danger" />
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
          onClick={() => setEndGameOpen(true)}
        >
          <Flag className="w-4 h-4" />
          End Game
        </Button>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-[minmax(280px,1fr)_minmax(440px,1.2fr)_minmax(280px,1fr)] gap-3 p-3">
        <TeamPanel
          game={activeGame}
          side={leftSide}
          onFoulSubject={subject =>
            setFoulTarget({ side: leftSide, subject })
          }
          onTimeout={() => startTimeout(leftSide)}
          onOpenPlayers={() => setPlayersSide(leftSide)}
          onOpenColours={() => setColoursSide(leftSide)}
          onEventTap={setEditingEvent}
          logRatio={logRatio}
          onLogRatioChange={r => setLogRatio(clampRatio(r))}
        />

        <section className="flex flex-col gap-3 min-h-0 h-full">
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

          <TimeoutTimer
            active={
              activeTimeout && activeTimeoutTeamInfo
                ? {
                    team: activeTimeout.team,
                    teamInfo: activeTimeoutTeamInfo,
                    startedAt: activeTimeout.startedAt
                  }
                : null
            }
            onStop={() => setActiveTimeout(null)}
            onExpired={() => setActiveTimeout(null)}
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

          <div className="mt-auto">
            <WarningsGrid onTap={type => setWarningType(type)} />
          </div>
        </section>

        <TeamPanel
          game={activeGame}
          side={rightSide}
          onFoulSubject={subject =>
            setFoulTarget({ side: rightSide, subject })
          }
          onTimeout={() => startTimeout(rightSide)}
          onOpenPlayers={() => setPlayersSide(rightSide)}
          onOpenColours={() => setColoursSide(rightSide)}
          onEventTap={setEditingEvent}
          logRatio={logRatio}
          onLogRatioChange={r => setLogRatio(clampRatio(r))}
        />
      </main>

      {foulTarget && (
        <FoulModal
          open={true}
          game={activeGame}
          side={foulTarget.side}
          subject={foulTarget.subject}
          onClose={() => {
            setFoulTarget(null);
            clearPastTarget();
          }}
          onCommit={logFoul}
          onStartTimeout={startTimeout}
          quarter={pastQuarterTarget ?? undefined}
        />
      )}
      {warningType && (
        <WarningModal
          open={true}
          game={activeGame}
          type={warningType}
          onClose={() => {
            setWarningType(null);
            clearPastTarget();
          }}
          onCommit={logWarning}
          quarter={pastQuarterTarget ?? undefined}
        />
      )}
      {possessionOpen && (
        <PossessionModal
          open={true}
          game={activeGame}
          onClose={() => setPossessionOpen(false)}
          onCommit={logPossession}
        />
      )}
      {quarterScoreOpen && (
        <QuarterScoreModal
          open={true}
          game={activeGame}
          onClose={() => setQuarterScoreOpen(false)}
          onCommit={recordQuarterScore}
        />
      )}
      {/* If the chair started this timeout from inside the FoulModal,
          defer the TimeoutModal until the foul has been entered first. */}
      {timeoutSide !== null && !foulTarget && (
        <TimeoutModal
          open={true}
          game={activeGame}
          side={timeoutSide}
          onClose={() => {
            setTimeoutSide(null);
            clearPastTarget();
          }}
          onCommit={logTimeout}
          onCancelTimer={cancelTimeoutTimer}
          quarter={pastQuarterTarget ?? undefined}
        />
      )}
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
      {editingEvent && (
        <EditEventModal
          open={true}
          game={activeGame}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
      {endGameOpen && (
        <EndGameModal
          open
          game={activeGame}
          onClose={() => setEndGameOpen(false)}
          onConfirm={handleEndGame}
        />
      )}
      {officialsOpen && (
        <OfficialsModal
          open
          game={activeGame}
          onClose={() => setOfficialsOpen(false)}
        />
      )}
      {gameDetailsOpen && (
        <GameDetailsModal
          open
          game={activeGame}
          onClose={() => setGameDetailsOpen(false)}
        />
      )}
      {protestOpen && (
        <ProtestModal
          open
          game={activeGame}
          onClose={() => {
            setProtestOpen(false);
            clearPastTarget();
          }}
          onCommit={logProtest}
          quarter={pastQuarterTarget ?? undefined}
        />
      )}
      {pastQuarterOpen && (
        <PastQuarterModal
          open
          game={activeGame}
          onClose={() => setPastQuarterOpen(false)}
          onPick={handlePastEntryPick}
        />
      )}
    </div>
  );
}
