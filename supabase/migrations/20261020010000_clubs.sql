-- Clubs: the parent of teams. A club (e.g. South Adelaide Panthers) owns its
-- colours and logo; each team row is that club's roster in one division.

create table if not exists public.clubs (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  name_key         text generated always as (lower(btrim(name))) stored unique,
  jersey_colour    text,
  number_colour    text,
  -- Path inside the public `club-logos` storage bucket.
  logo_path        text,
  created_by       uuid,
  created_by_email text,
  created_at       timestamptz not null default now(),
  updated_by       uuid,
  updated_by_email text,
  updated_at       timestamptz not null default now()
);

drop trigger if exists clubs_stamp on public.clubs;
create trigger clubs_stamp before insert or update on public.clubs
  for each row execute function public.stamp_row();

alter table public.clubs enable row level security;

drop policy if exists "clubs: members read" on public.clubs;
create policy "clubs: members read" on public.clubs
  for select to authenticated using (public.is_member());

drop policy if exists "clubs: members insert" on public.clubs;
create policy "clubs: members insert" on public.clubs
  for insert to authenticated with check (public.is_member());

drop policy if exists "clubs: members update" on public.clubs;
create policy "clubs: members update" on public.clubs
  for update to authenticated
  using (public.is_member()) with check (public.is_member());

drop policy if exists "clubs: admins delete" on public.clubs;
create policy "clubs: admins delete" on public.clubs
  for delete to authenticated using (public.is_admin());

alter table public.teams
  add column if not exists club_id uuid references public.clubs (id) on delete set null;
create index if not exists teams_club_idx on public.teams (club_id);

-- ── Club logos (public bucket; members upload) ─────────────────────────
insert into storage.buckets (id, name, public)
values ('club-logos', 'club-logos', true)
on conflict (id) do nothing;

drop policy if exists "club-logos: members upload" on storage.objects;
create policy "club-logos: members upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'club-logos' and public.is_member());

drop policy if exists "club-logos: members update" on storage.objects;
create policy "club-logos: members update" on storage.objects
  for update to authenticated
  using (bucket_id = 'club-logos' and public.is_member());

-- ── Backfill from games already uploaded ───────────────────────────────
-- One club per distinct team name, using the colours from its most
-- recently updated game.
with sides as (
  select g.updated_at, g.data -> 'teamA' as t from public.games g
  union all
  select g.updated_at, g.data -> 'teamB' as t from public.games g
), latest as (
  select distinct on (lower(btrim(t ->> 'name')))
    btrim(t ->> 'name') as name, t ->> 'jerseyColour' as jersey, t ->> 'numberColour' as num
  from sides
  where coalesce(btrim(t ->> 'name'), '') <> ''
  order by lower(btrim(t ->> 'name')), updated_at desc
)
insert into public.clubs (name, jersey_colour, number_colour, created_by_email)
select name, jersey, num, 'backfill' from latest
on conflict (name_key) do nothing;

-- One roster per club + division, from the most recent game that has players.
with sides as (
  select g.updated_at, coalesce(g.data ->> 'division', '') as division, g.data -> 'teamA' as t from public.games g
  union all
  select g.updated_at, coalesce(g.data ->> 'division', '') as division, g.data -> 'teamB' as t from public.games g
), latest as (
  select distinct on (lower(btrim(t ->> 'name')), lower(btrim(division)))
    btrim(t ->> 'name') as name, btrim(division) as division, t
  from sides
  where coalesce(btrim(t ->> 'name'), '') <> ''
    and jsonb_array_length(coalesce(t -> 'players', '[]'::jsonb)) > 0
  order by lower(btrim(t ->> 'name')), lower(btrim(division)), updated_at desc
)
insert into public.teams (name, division, club_id, jersey_colour, number_colour,
                          coach_name, assistant_coach_name, captain_number, players, created_by_email)
select l.name, l.division, c.id, l.t ->> 'jerseyColour', l.t ->> 'numberColour',
       nullif(l.t ->> 'coachName', ''), nullif(l.t ->> 'assistantCoachName', ''),
       (select p ->> 'number' from jsonb_array_elements(l.t -> 'players') p
         where p ->> 'id' = l.t ->> 'captainId' limit 1),
       (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('number', p ->> 'number', 'name', nullif(p ->> 'name', ''))))
          from jsonb_array_elements(l.t -> 'players') p),
       'backfill'
from latest l
join public.clubs c on c.name_key = lower(l.name)
on conflict (name_key, division_key) do nothing;

-- Link any existing team rows to their club by name.
update public.teams t set club_id = c.id
from public.clubs c
where t.club_id is null and c.name_key = t.name_key;

select (select count(*) from public.clubs) as clubs, (select count(*) from public.teams) as teams;
