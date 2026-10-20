import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/state/AuthProvider';
import { applyClub, searchClubs, uploadClubLogo, type SharedClub } from '@/lib/clubsRepo';
import { applySharedTeam, rostersForClub, type SharedTeam } from '@/lib/teamsRepo';
import type { Team } from '@/types';

interface Props {
  team: Team;
  division: string;
  onChange: (next: Team) => void;
}

/**
 * Team name input that doubles as a club search. Picking a club fills in its
 * name, colours and logo, then offers the club's saved roster for this
 * division. Signed out, it's a plain text input.
 */
export function ClubField({ team, division, onChange }: Props) {
  const { user } = useAuth();
  const [focused, setFocused] = useState(false);
  const [clubs, setClubs] = useState<SharedClub[]>([]);

  useEffect(() => {
    if (!user || !focused) return;
    let cancelled = false;
    const t = setTimeout(() => {
      searchClubs(team.name)
        .then(r => !cancelled && setClubs(r))
        .catch(() => !cancelled && setClubs([]));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [user, focused, team.name]);

  const exact = clubs.some(c => c.name.toLowerCase() === team.name.trim().toLowerCase());
  const showList = !!user && focused && clubs.length > 0 && !(exact && clubs.length === 1);

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex items-center gap-3">
          {team.logoUrl && (
            <img
              src={team.logoUrl}
              alt=""
              className="w-14 h-14 rounded-2xl object-contain bg-white border border-border shrink-0"
            />
          )}
          <input
            type="text"
            value={team.name}
            onChange={e =>
              // Typing a different name detaches the team from the picked club.
              onChange({ ...team, name: e.target.value, clubId: undefined, logoUrl: undefined })
            }
            onFocus={() => setFocused(true)}
            // Delay so a tap on a suggestion lands before the list closes.
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={user ? 'Search clubs or type a new name' : 'e.g. Eagles'}
            className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-lg"
          />
        </div>
        {showList && (
          <ul className="absolute z-20 left-0 right-0 mt-2 max-h-72 overflow-auto rounded-2xl border border-border bg-surface shadow-xl">
            {clubs.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onPointerDown={e => e.preventDefault()}
                  onClick={() => {
                    onChange(applyClub(team, c));
                    setFocused(false);
                  }}
                  className="w-full min-h-[56px] px-4 py-2 flex items-center gap-3 text-left active:bg-surface-hi"
                >
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt="" className="w-9 h-9 rounded-lg object-contain bg-white" />
                  ) : (
                    <span
                      className="w-9 h-9 rounded-lg border border-border"
                      style={{ backgroundColor: c.jerseyColour ?? '#6b7280' }}
                    />
                  )}
                  <span className="text-base font-semibold truncate">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {user && team.clubId && <ClubLogoButton team={team} onChange={onChange} />}
      {user && team.name.trim() && (
        <RosterOffer team={team} division={division} onLoad={onChange} />
      )}
    </div>
  );
}

function ClubLogoButton({ team, onChange }: { team: Team; onChange: (t: Team) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file || !team.clubId) return;
          setBusy(true);
          setError(null);
          try {
            const url = await uploadClubLogo(team.clubId, file);
            onChange({ ...team, logoUrl: url });
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button variant="ghost" size="md" disabled={busy} onClick={() => input.current?.click()}>
        <ImagePlus className="w-4 h-4" />
        {busy ? 'Uploading…' : team.logoUrl ? 'Change club logo' : 'Add club logo'}
      </Button>
      {error && <div className="text-xs text-danger mt-1">{error}</div>}
    </div>
  );
}

/**
 * Offers the club's saved rosters — this division first — when the team has
 * no players yet. Dismissed per club name.
 */
function RosterOffer({
  team,
  division,
  onLoad
}: {
  team: Team;
  division: string;
  onLoad: (t: Team) => void;
}) {
  const [rosters, setRosters] = useState<SharedTeam[]>([]);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const key = team.name.trim().toLowerCase();

  useEffect(() => {
    if (!key || team.players.length > 0) {
      setRosters([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      rostersForClub(team.name, division)
        .then(r => !cancelled && setRosters(r))
        .catch(() => !cancelled && setRosters([]));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [key, division, team.players.length]);

  if (rosters.length === 0 || dismissedFor === key || team.players.length > 0) return null;

  const div = division.trim().toLowerCase();
  return (
    <div className="rounded-2xl border border-accent bg-surface-hi p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Users className="w-4 h-4" />
        Saved rosters for {rosters[0].name}
      </div>
      <div className="flex flex-wrap gap-2">
        {rosters.slice(0, 4).map(r => (
          <Button
            key={r.id}
            variant={r.division.toLowerCase() === div ? 'primary' : 'secondary'}
            size="md"
            onClick={() => onLoad(applySharedTeam(team, r))}
          >
            Load {r.division || 'roster'} · {r.players.length} players
          </Button>
        ))}
        <Button variant="ghost" size="md" onClick={() => setDismissedFor(key)}>
          Not now
        </Button>
      </div>
    </div>
  );
}
