import { useState } from 'react';
import { ArrowLeft, Play, ArrowLeftRight, ChevronDown } from 'lucide-react';
import { useApp } from '@/state/AppProvider';
import { Button } from '@/components/ui/Button';
import { ColourSwatchPicker } from '@/components/ColourSwatchPicker';
import { PlayerEditor } from '@/components/PlayerEditor';
import { JerseyPreview } from '@/components/JerseyPreview';
import { TEAM_SWATCHES, contrastText } from '@/lib/colours';
import { blankTeam, newGame, todayISO } from '@/lib/game';
import { cn } from '@/lib/utils';
import type { BenchLayout, Officials, Player, Team } from '@/types';

export function NewGameScreen() {
  const { dispatch } = useApp();

  const [date, setDate] = useState(todayISO());
  const [division, setDivision] = useState('');
  const [competition, setCompetition] = useState('');
  const [venue, setVenue] = useState('');
  const [tipTime, setTipTime] = useState('');
  const [teamA, setTeamA] = useState(() => blankTeam(TEAM_SWATCHES[0]));
  const [teamB, setTeamB] = useState(() => blankTeam(TEAM_SWATCHES[6]));
  const [layout, setLayout] = useState<BenchLayout>('A-left');
  const [officials, setOfficials] = useState<Officials>({});
  const [officialsOpen, setOfficialsOpen] = useState(false);

  const canStart = teamA.name.trim() && teamB.name.trim();

  const start = () => {
    if (!canStart) return;
    const cleanOfficials: Officials = Object.fromEntries(
      Object.entries(officials).filter(([, v]) => v && v.trim())
    );
    const game = newGame({
      date,
      division: division.trim(),
      teamA: { ...teamA, name: teamA.name.trim() },
      teamB: { ...teamB, name: teamB.name.trim() },
      layout
    });
    if (competition.trim()) game.competition = competition.trim();
    if (venue.trim()) game.venue = venue.trim();
    if (tipTime.trim()) game.tipTime = tipTime.trim();
    if (Object.keys(cleanOfficials).length > 0) game.officials = cleanOfficials;
    dispatch({ type: 'CREATE_GAME', game });
  };

  const leftIsA = layout === 'A-left';
  const leftTeam = leftIsA ? teamA : teamB;
  const rightTeam = leftIsA ? teamB : teamA;
  const leftLabel = leftIsA ? 'Team A' : 'Team B';
  const rightLabel = leftIsA ? 'Team B' : 'Team A';

  return (
    <div className="min-h-full w-full bg-bg text-fg px-6 pb-6 pt-safe-6 overflow-auto">
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

        <section className="rounded-3xl border border-border bg-surface p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-fg uppercase tracking-widest">
            Game details
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base font-mono"
              />
            </Field>
            <Field label="Tip-off time (optional)">
              <input
                type="time"
                value={tipTime}
                onChange={e => setTipTime(e.target.value)}
                className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base font-mono"
              />
            </Field>
            <Field label="Venue (optional)">
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Adelaide Arena Court 2"
                className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Competition (optional)">
              <input
                type="text"
                value={competition}
                onChange={e => setCompetition(e.target.value)}
                placeholder="e.g. NBL1 Central"
                className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
              />
            </Field>
            <Field label="Division (optional)">
              <input
                type="text"
                value={division}
                onChange={e => setDivision(e.target.value)}
                placeholder="e.g. Senior Men A"
                className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
              />
            </Field>
          </div>
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

        <section className="rounded-3xl border border-border bg-surface overflow-hidden">
          <button
            type="button"
            onClick={() => setOfficialsOpen(o => !o)}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 active:brightness-110 transition-none"
          >
            <div className="text-left">
              <div className="text-sm font-semibold text-muted-fg uppercase tracking-widest">
                Officials (optional)
              </div>
              <div className="text-xs text-muted-fg mt-0.5">
                Crew chief, umpires, table officials. Recorded on the export.
              </div>
            </div>
            <ChevronDown
              className={cn(
                'w-5 h-5 transition-transform shrink-0',
                officialsOpen && 'rotate-180'
              )}
            />
          </button>
          {officialsOpen && (
            <div className="px-5 pb-5">
              <OfficialsForm officials={officials} onChange={setOfficials} />
            </div>
          )}
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Head coach (optional)">
            <input
              type="text"
              value={team.coachName ?? ''}
              onChange={e =>
                onChange(t => ({ ...t, coachName: e.target.value }))
              }
              placeholder="e.g. M. Smith"
              className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
            />
          </Field>
          <Field label="Assistant coach (optional)">
            <input
              type="text"
              value={team.assistantCoachName ?? ''}
              onChange={e =>
                onChange(t => ({ ...t, assistantCoachName: e.target.value }))
              }
              placeholder="e.g. R. Jones"
              className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 text-base"
            />
          </Field>
        </div>

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
            captainId={team.captainId}
            onCaptainChange={id =>
              onChange(t => ({ ...t, captainId: id ?? undefined }))
            }
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

const OFFICIAL_FIELDS: Array<{
  key: keyof Officials;
  label: string;
  hint?: string;
}> = [
  { key: 'crewChief', label: 'Crew chief (referee 1)' },
  { key: 'umpire1', label: 'Umpire 1 (referee 2)' },
  { key: 'umpire2', label: 'Umpire 2 (referee 3)' },
  { key: 'commissioner', label: 'Commissioner' },
  { key: 'scorer', label: 'Scorer' },
  { key: 'assistantScorer', label: 'Assistant scorer' },
  { key: 'timer', label: 'Timer' },
  { key: 'shotClockOperator', label: 'Shot-clock operator' }
];

export function OfficialsForm({
  officials,
  onChange
}: {
  officials: Officials;
  onChange: (next: Officials) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OFFICIAL_FIELDS.map(({ key, label }) => (
        <Field key={key} label={label}>
          <input
            type="text"
            value={officials[key] ?? ''}
            onChange={e => onChange({ ...officials, [key]: e.target.value })}
            placeholder="Name"
            className="h-11 w-full rounded-xl bg-surface-hi border border-border px-3 text-sm"
          />
        </Field>
      ))}
    </div>
  );
}
