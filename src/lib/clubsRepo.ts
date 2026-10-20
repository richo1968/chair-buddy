import { supabase } from './supabase';
import type { Team } from '@/types';

/** A club (e.g. South Adelaide Panthers): owns colours and logo; teams are its rosters per division. */
export interface SharedClub {
  id: string;
  name: string;
  jerseyColour?: string;
  numberColour?: string;
  logoUrl?: string;
  updatedAt: string;
}

interface ClubRow {
  id: string;
  name: string;
  jersey_colour: string | null;
  number_colour: string | null;
  logo_path: string | null;
  updated_at: string;
}

const COLUMNS = 'id,name,jersey_colour,number_colour,logo_path,updated_at';
const LOGO_BUCKET = 'club-logos';

export function logoUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function fromRow(r: ClubRow): SharedClub {
  return {
    id: r.id,
    name: r.name,
    jerseyColour: r.jersey_colour ?? undefined,
    numberColour: r.number_colour ?? undefined,
    logoUrl: logoUrl(r.logo_path),
    updatedAt: r.updated_at
  };
}

/** Clubs whose name contains `query`, alphabetical. */
export async function searchClubs(query: string): Promise<SharedClub[]> {
  const q = query.trim().replace(/[%_,()]/g, ' ');
  let req = supabase.from('clubs').select(COLUMNS).order('name').limit(20);
  if (q) req = req.ilike('name', `%${q}%`);
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return (data as unknown as ClubRow[]).map(fromRow);
}

async function findClubByName(name: string): Promise<SharedClub | null> {
  const { data, error } = await supabase
    .from('clubs')
    .select(COLUMNS)
    .eq('name_key', name.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as unknown as ClubRow) : null;
}

/**
 * Make sure the team's club exists, without touching an existing club's
 * colours — a team in its away strip shouldn't recolour the club for everyone.
 */
export async function ensureClub(team: Team): Promise<SharedClub | null> {
  if (!team.name.trim()) return null;
  const existing = await findClubByName(team.name);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('clubs')
    .insert({
      name: team.name.trim(),
      jersey_colour: team.jerseyColour,
      number_colour: team.numberColour
    })
    .select(COLUMNS)
    .single();
  if (error) {
    // Another chair created it at the same moment.
    if (error.code === '23505') return findClubByName(team.name);
    throw new Error(error.message);
  }
  return fromRow(data as unknown as ClubRow);
}

/** Explicit save: create the club or overwrite its colours with this team's. */
export async function saveClubColours(team: Team): Promise<SharedClub> {
  const { data, error } = await supabase
    .from('clubs')
    .upsert(
      {
        name: team.name.trim(),
        jersey_colour: team.jerseyColour,
        number_colour: team.numberColour
      },
      { onConflict: 'name_key' }
    )
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as unknown as ClubRow);
}

/** Upload a logo image for a club and return its public URL. */
export async function uploadClubLogo(clubId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${clubId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw new Error(upErr.message);
  const { error } = await supabase.from('clubs').update({ logo_path: path }).eq('id', clubId);
  if (error) throw new Error(error.message);
  return logoUrl(path)!;
}

/** Apply a club to a team: name, colours, logo. Players are untouched. */
export function applyClub(team: Team, club: SharedClub): Team {
  return {
    ...team,
    name: club.name,
    clubId: club.id,
    jerseyColour: club.jerseyColour ?? team.jerseyColour,
    numberColour: club.numberColour ?? team.numberColour,
    logoUrl: club.logoUrl
  };
}
