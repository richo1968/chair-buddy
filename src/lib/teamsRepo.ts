import { supabase } from './supabase';
import { newId } from './game';
import { saveClubColours } from './clubsRepo';
import type { Player, Team } from '@/types';

/** A team roster as stored in the shared `teams` table. */
export interface SharedTeam {
  id: string;
  name: string;
  division: string;
  clubId?: string;
  jerseyColour?: string;
  numberColour?: string;
  coachName?: string;
  assistantCoachName?: string;
  captainNumber?: string;
  players: { number: string; name?: string }[];
  updatedAt: string;
  updatedByEmail?: string;
}

interface TeamRow {
  id: string;
  name: string;
  division: string;
  club_id: string | null;
  jersey_colour: string | null;
  number_colour: string | null;
  coach_name: string | null;
  assistant_coach_name: string | null;
  captain_number: string | null;
  players: { number: string; name?: string }[] | null;
  updated_at: string;
  updated_by_email: string | null;
}

const COLUMNS =
  'id,name,division,club_id,jersey_colour,number_colour,coach_name,assistant_coach_name,captain_number,players,updated_at,updated_by_email';

function fromRow(r: TeamRow): SharedTeam {
  return {
    id: r.id,
    name: r.name,
    division: r.division,
    clubId: r.club_id ?? undefined,
    jerseyColour: r.jersey_colour ?? undefined,
    numberColour: r.number_colour ?? undefined,
    coachName: r.coach_name ?? undefined,
    assistantCoachName: r.assistant_coach_name ?? undefined,
    captainNumber: r.captain_number ?? undefined,
    players: r.players ?? [],
    updatedAt: r.updated_at,
    updatedByEmail: r.updated_by_email ?? undefined
  };
}

/** Teams whose name contains `query`, most recently updated first. */
export async function searchTeams(query: string): Promise<SharedTeam[]> {
  const q = query.trim().replace(/[%_,()]/g, ' ');
  let req = supabase
    .from('teams')
    .select(COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(30);
  if (q) req = req.ilike('name', `%${q}%`);
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return (data as unknown as TeamRow[]).map(fromRow);
}

/**
 * Push a team's roster to the shared database, keyed by name + division.
 * Overwrites the previous roster (the old one is kept in `team_versions`).
 */
export async function saveTeam(team: Team, division: string): Promise<SharedTeam> {
  // Saving a roster also saves the club's colours — this is the explicit
  // "these are the club's colours" action.
  const club = await saveClubColours(team);
  const captain = team.players.find(p => p.id === team.captainId);
  const { data, error } = await supabase
    .from('teams')
    .upsert(
      {
        name: team.name.trim(),
        division: division.trim(),
        club_id: club.id,
        jersey_colour: team.jerseyColour,
        number_colour: team.numberColour,
        coach_name: team.coachName?.trim() || null,
        assistant_coach_name: team.assistantCoachName?.trim() || null,
        captain_number: captain?.number ?? null,
        players: team.players.map(p => ({
          number: p.number,
          ...(p.name ? { name: p.name } : {})
        }))
      },
      { onConflict: 'name_key,division_key' }
    )
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as unknown as TeamRow);
}

/** Saved rosters for a club (matched by name), the given division first. */
export async function rostersForClub(name: string, division: string): Promise<SharedTeam[]> {
  if (!name.trim()) return [];
  const { data, error } = await supabase
    .from('teams')
    .select(COLUMNS)
    .eq('name_key', name.trim().toLowerCase())
    .order('updated_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  const div = division.trim().toLowerCase();
  return (data as unknown as TeamRow[])
    .map(fromRow)
    .filter(t => t.players.length > 0)
    .sort((a, b) => Number(b.division.toLowerCase() === div) - Number(a.division.toLowerCase() === div));
}

/**
 * Merge a shared roster into an existing one. Players are matched by number
 * so existing player ids (which fouls reference) are kept — only names change.
 * Players not in the shared roster are kept too, since they may already have
 * events logged against them mid-game.
 */
export function mergeRoster(existing: Player[], shared: SharedTeam['players']): Player[] {
  const byNumber = new Map(existing.map(p => [p.number.trim(), p]));
  const merged: Player[] = [];
  const used = new Set<string>();
  for (const s of shared) {
    const num = s.number.trim();
    const match = byNumber.get(num);
    if (match) {
      merged.push({ ...match, name: s.name || match.name });
      used.add(match.id);
    } else {
      merged.push({ id: newId(), number: num, name: s.name || undefined });
    }
  }
  for (const p of existing) if (!used.has(p.id)) merged.push(p);
  return merged;
}

/** Apply a shared roster to a team: colours, coaches, captain and players. */
export function applySharedTeam(team: Team, shared: SharedTeam): Team {
  const players = mergeRoster(team.players, shared.players);
  const captain = shared.captainNumber
    ? players.find(p => p.number.trim() === shared.captainNumber?.trim())
    : undefined;
  return {
    ...team,
    name: team.name.trim() ? team.name : shared.name,
    clubId: team.clubId ?? shared.clubId,
    jerseyColour: shared.jerseyColour ?? team.jerseyColour,
    numberColour: shared.numberColour ?? team.numberColour,
    coachName: shared.coachName ?? team.coachName,
    assistantCoachName: shared.assistantCoachName ?? team.assistantCoachName,
    captainId: captain?.id ?? team.captainId,
    players
  };
}

export async function checkMembership(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_member');
  if (error) return false;
  return data === true;
}
