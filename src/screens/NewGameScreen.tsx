import { useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { Button } from '@/components/ui/Button';
import { ColourSwatchPicker } from '@/components/ColourSwatchPicker';
import { PlayerEditor } from '@/components/PlayerEditor';
import { TEAM_SWATCHES } from '@/lib/colours';
import { blankTeam, newGame, todayISO } from '@/lib/game';
import type { Player } from '@/types';
import { contrastText } from '@/lib/colours';

export function NewGameScreen() {
  const { dispatch } = useApp();

  const [date, setDate] = useState(todayISO());
  const [division, setDivision] = useState('');
  const [teamA, setTeamA] = useState(() => blankTeam(TEAM_SWATCHES[0]));
  const [teamB, setTeamB] = useState(() => blankTeam(TEAM_SWATCHES[6]));

  const canStart = teamA.name.trim() && teamB.name.trim();

  const start = () => {
    if (!canStart) return;
    const game = newGame({
      date,
      division: division.trim(),
      teamA: { ...teamA, name: teamA.name.trim() },
      teamB: { ...teamB, name: teamB.name.trim() }
    });
    dispatch({ type: 'CREATE_GAME', game });
  };

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
  team,
  onChange,
  onPlayersChange
}: {
  label: string;
  team: { name: string; colour: string; players: Player[] };
  onChange: (
    updater: (t: { name: string; colour: string; players: Player[] }) => { name: string; colour: string; players: Player[] }
  ) => void;
  onPlayersChange: (players: Player[]) => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface overflow-hidden">
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ backgroundColor: team.colour, color: contrastText(team.colour) }}
      >
        <span className="text-sm uppercase tracking-widest font-semibold opacity-80">
          {label}
        </span>
        <span className="text-lg font-bold truncate max-w-[60%]">
          {team.name || '—'}
        </span>
      </div>
      <div className="p-5 space-y-5">
        <Field label="Team name">
          <input
            type="text"
            value={team.name}
            onChange={e => onChange(t => ({ ...t, name: e.target.value }))}
            placeholder="e.g. Eagles"
            className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-lg"
          />
        </Field>
        <Field label="Colour">
          <ColourSwatchPicker
            value={team.colour}
            onChange={hex => onChange(t => ({ ...t, colour: hex }))}
          />
        </Field>
        <Field label={`Players (${team.players.length})`}>
          <PlayerEditor
            players={team.players}
            onChange={onPlayersChange}
            accent={team.colour}
          />
        </Field>
      </div>
    </div>
  );
}
