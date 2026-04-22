import { useState } from 'react';
import { ArrowLeft, Play, ArrowLeftRight } from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { Button } from '@/components/ui/Button';
import { ColourSwatchPicker } from '@/components/ColourSwatchPicker';
import { PlayerEditor } from '@/components/PlayerEditor';
import { JerseyPreview } from '@/components/JerseyPreview';
import { TEAM_SWATCHES, contrastText } from '@/lib/colours';
import { blankTeam, newGame, todayISO } from '@/lib/game';
import type { BenchLayout, Player, Team } from '@/types';

export function NewGameScreen() {
  const { dispatch } = useApp();

  const [date, setDate] = useState(todayISO());
  const [division, setDivision] = useState('');
  const [teamA, setTeamA] = useState(() => blankTeam(TEAM_SWATCHES[0]));
  const [teamB, setTeamB] = useState(() => blankTeam(TEAM_SWATCHES[6]));
  const [layout, setLayout] = useState<BenchLayout>('A-left');

  const canStart = teamA.name.trim() && teamB.name.trim();

  const start = () => {
    if (!canStart) return;
    const game = newGame({
      date,
      division: division.trim(),
      teamA: { ...teamA, name: teamA.name.trim() },
      teamB: { ...teamB, name: teamB.name.trim() },
      layout
    });
    dispatch({ type: 'CREATE_GAME', game });
  };

  const leftIsA = layout === 'A-left';
  const leftTeam = leftIsA ? teamA : teamB;
  const rightTeam = leftIsA ? teamB : teamA;
  const leftLabel = leftIsA ? 'Team A' : 'Team B';
  const rightLabel = leftIsA ? 'Team B' : 'Team A';

  return (
    <div className="min-h-full w-full bg-bg text-fg p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={() => dispatch({ type: 'GO_HOME' })}
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">New game</h1>
          </div>
          <Button size="lg" onClick={start} disabled={!canStart}>
            <Play className="w-5 h-5" />
            Start Game
          </Button>
        </header>

        <section className="grid grid-cols-2 gap-6">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-lg font-mono"
            />
          </Field>
          <Field label="Division (optional)">
            <input
              type="text"
              value={division}
              onChange={e => setDivision(e.target.value)}
              placeholder="e.g. Senior Men A"
              className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-lg"
            />
          </Field>
        </section>

        <section className="grid grid-cols-2 gap-6">
          <TeamPanel
            label="Team A"
            hint="Named first — often the home team"
            team={teamA}
            onChange={setTeamA}
            onPlayersChange={players => setTeamA(t => ({ ...t, players }))}
          />
          <TeamPanel
            label="Team B"
            team={teamB}
            onChange={setTeamB}
            onPlayersChange={players => setTeamB(t => ({ ...t, players }))}
          />
        </section>

        <section className="rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm text-muted-fg mb-1">Bench layout</div>
              <div className="text-sm text-muted-fg">
                Which team sits on the left of the scoretable? You can swap mid-game.
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                setLayout(l => (l === 'A-left' ? 'A-right' : 'A-left'))
              }
            >
              <ArrowLeftRight className="w-5 h-5" />
              Swap
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <BenchSlot position="Left" label={leftLabel} team={leftTeam} />
            <BenchSlot position="Right" label={rightLabel} team={rightTeam} />
          </div>
        </section>

        <div className="flex justify-end">
          <Button size="xl" onClick={start} disabled={!canStart}>
            <Play className="w-6 h-6" />
            Start Game
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-muted-fg mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function TeamPanel({
  label,
  hint,
  team,
  onChange,
  onPlayersChange
}: {
  label: string;
  hint?: string;
  team: Team;
  onChange: (updater: (t: Team) => Team) => void;
  onPlayersChange: (players: Player[]) => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface overflow-hidden">
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          backgroundColor: team.jerseyColour,
          color: team.numberColour
        }}
      >
        <span className="text-sm uppercase tracking-widest font-semibold opacity-80">
          {label}
        </span>
        <span className="text-lg font-bold truncate max-w-[60%]">
          {team.name || '—'}
        </span>
      </div>
      <div className="p-5 space-y-5">
        {hint && <div className="text-xs text-muted-fg -mt-1">{hint}</div>}

        <Field label="Team name">
          <input
            type="text"
            value={team.name}
            onChange={e => onChange(t => ({ ...t, name: e.target.value }))}
            placeholder="e.g. Eagles"
            className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-lg"
          />
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
          <Field label="Jersey colour">
            <ColourSwatchPicker
              value={team.jerseyColour}
              onChange={hex =>
                onChange(t => ({
                  ...t,
                  jerseyColour: hex,
                  numberColour:
                    t.numberColour === contrastText(t.jerseyColour)
                      ? contrastText(hex)
                      : t.numberColour
                }))
              }
            />
          </Field>
          <div className="flex flex-col items-center gap-2 mb-1">
            <div className="text-xs text-muted-fg">Preview</div>
            <JerseyPreview
              jerseyColour={team.jerseyColour}
              numberColour={team.numberColour}
              number={team.players[0]?.number || '7'}
              size="lg"
            />
          </div>
        </div>

        <Field label="Number colour">
          <ColourSwatchPicker
            value={team.numberColour}
            onChange={hex => onChange(t => ({ ...t, numberColour: hex }))}
          />
        </Field>

        <Field label={`Players (${team.players.length})`}>
          <PlayerEditor
            players={team.players}
            onChange={onPlayersChange}
            accent={team.jerseyColour}
          />
        </Field>
      </div>
    </div>
  );
}

function BenchSlot({
  position,
  label,
  team
}: {
  position: string;
  label: string;
  team: Team;
}) {
  return (
    <div
      className="rounded-2xl border-2 border-border flex items-center gap-3 p-3"
      style={{
        backgroundColor: team.jerseyColour,
        color: team.numberColour
      }}
    >
      <div className="text-xs font-semibold uppercase tracking-wider opacity-75 w-12 shrink-0">
        {position}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-widest opacity-75">{label}</div>
        <div className="font-bold truncate">{team.name || '—'}</div>
      </div>
    </div>
  );
}
