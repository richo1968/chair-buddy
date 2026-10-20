import { useEffect, useState } from 'react';
import { CloudDownload, CloudUpload, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/state/AuthProvider';
import { applySharedTeam, saveTeam, searchTeams, type SharedTeam } from '@/lib/teamsRepo';
import type { Team } from '@/types';

interface Props {
  team: Team;
  /** Division of the current game — rosters are shared per name + division. */
  division: string;
  /** Called with the team after a shared roster has been merged in. */
  onLoad: (next: Team) => void;
}

/**
 * Load / Save buttons for the shared team database. Loading merges by player
 * number so it's safe mid-game: existing player ids (and their fouls) are kept.
 */
export function TeamSyncBar({ team, division, onLoad }: Props) {
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="text-xs text-muted-fg">
        Sign in on the home screen to load or save shared team rosters.
      </div>
    );
  }

  const save = async () => {
    if (!team.name.trim()) {
      setStatus('Enter a team name first.');
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await saveTeam(team, division);
      setStatus(`Saved ${team.players.length} players to the shared database.`);
    } catch (err) {
      setStatus(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="md" onClick={() => setPickerOpen(true)}>
          <CloudDownload className="w-4 h-4" />
          Load from database
        </Button>
        <Button variant="secondary" size="md" onClick={save} disabled={saving}>
          <CloudUpload className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save to database'}
        </Button>
      </div>
      {status && <div className="text-xs text-muted-fg">{status}</div>}
      <TeamPickerModal
        open={pickerOpen}
        initialQuery={team.name}
        division={division}
        onClose={() => setPickerOpen(false)}
        onPick={shared => {
          onLoad(applySharedTeam(team, shared));
          setStatus(`Loaded ${shared.players.length} players for ${shared.name}.`);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function TeamPickerModal({
  open,
  initialQuery,
  division,
  onClose,
  onPick
}: {
  open: boolean;
  initialQuery: string;
  division: string;
  onClose: () => void;
  onPick: (team: SharedTeam) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SharedTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setQuery(initialQuery);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      searchTeams(query)
        .then(r => {
          if (cancelled) return;
          // Same-division matches first, then most recently updated.
          const div = division.trim().toLowerCase();
          r.sort(
            (a, b) =>
              Number(b.division.toLowerCase() === div) -
              Number(a.division.toLowerCase() === div)
          );
          setResults(r);
        })
        .catch(err => !cancelled && setError((err as Error).message))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, query, division]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Load team from database"
      subtitle="Players are matched by number, so existing fouls stay attached."
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="space-y-4">
        <label className="flex items-center gap-2 h-14 rounded-2xl bg-surface-hi border border-border px-4">
          <Search className="w-5 h-5 text-muted-fg" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search team name"
            className="flex-1 bg-transparent text-lg outline-none"
            autoFocus
          />
        </label>
        {error && <div className="text-sm text-danger">{error}</div>}
        {loading && results.length === 0 && (
          <div className="text-sm text-muted-fg">Searching…</div>
        )}
        {!loading && !error && results.length === 0 && (
          <div className="text-sm text-muted-fg">No saved teams match.</div>
        )}
        <ul className="space-y-2 max-h-[50vh] overflow-auto">
          {results.map(t => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onPick(t)}
                className="w-full min-h-[60px] rounded-2xl border border-border bg-surface-hi px-4 py-3 flex items-center gap-4 text-left active:brightness-125"
              >
                <span
                  className="w-10 h-10 rounded-xl border border-border shrink-0"
                  style={{ backgroundColor: t.jerseyColour ?? '#6b7280' }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-lg font-semibold truncate">{t.name}</span>
                  <span className="block text-xs text-muted-fg truncate">
                    {t.division || 'No division'} · {t.players.length} players · updated{' '}
                    {new Date(t.updatedAt).toLocaleDateString()}
                    {t.updatedByEmail ? ` by ${t.updatedByEmail}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
