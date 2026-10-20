-- Chair Buddy shared schema.
--
-- Shared model: every approved chair can see every game and every team
-- roster. Access is gated by the `members` allow-list rather than per-user
-- silos — anyone can request an OTP code, but only emails listed in
-- `members` can read or write data.
--
-- Run this once in the Supabase SQL editor of the new project, then add
-- yourself as an admin:
--   insert into public.members (email, role) values ('you@example.com', 'admin');

-- ── Members (allow-list) ────────────────────────────────────────────────
create table if not exists public.members (
  email      text primary key check (email = lower(email)),
  role       text not null default 'chair' check (role in ('chair', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

create or replace function public.current_email()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where email = public.current_email())
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where email = public.current_email() and role = 'admin'
  )
$$;

drop policy if exists "members: read own row" on public.members;
create policy "members: read own row" on public.members
  for select to authenticated
  using (email = public.current_email() or public.is_admin());

drop policy if exists "members: admins manage" on public.members;
create policy "members: admins manage" on public.members
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Shared audit columns ────────────────────────────────────────────────
create or replace function public.stamp_row()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by       := coalesce(new.created_by, auth.uid());
    new.created_by_email := coalesce(new.created_by_email, public.current_email());
    new.created_at       := coalesce(new.created_at, now());
  else
    -- Creator is immutable once set.
    new.created_by       := old.created_by;
    new.created_by_email := old.created_by_email;
    new.created_at       := old.created_at;
  end if;
  new.updated_by       := auth.uid();
  new.updated_by_email := public.current_email();
  new.updated_at       := now();
  return new;
end;
$$;

-- ── Games ───────────────────────────────────────────────────────────────
-- `data` holds the full Game JSON (see src/types.ts). The flat columns are
-- denormalised copies for listing/searching without parsing JSON.
create table if not exists public.games (
  id               text primary key,
  data             jsonb not null,
  game_date        date,
  division         text,
  competition      text,
  team_a           text,
  team_b           text,
  status           text,
  created_by       uuid,
  created_by_email text,
  created_at       timestamptz not null default now(),
  updated_by       uuid,
  updated_by_email text,
  updated_at       timestamptz not null default now()
);

create index if not exists games_updated_at_idx on public.games (updated_at desc);
create index if not exists games_date_idx on public.games (game_date desc);

create or replace function public.games_denormalise()
returns trigger language plpgsql as $$
begin
  new.game_date   := nullif(new.data ->> 'date', '')::date;
  new.division    := nullif(new.data ->> 'division', '');
  new.competition := nullif(new.data ->> 'competition', '');
  new.team_a      := new.data -> 'teamA' ->> 'name';
  new.team_b      := new.data -> 'teamB' ->> 'name';
  new.status      := new.data -> 'outcome' ->> 'kind';
  return new;
end;
$$;

drop trigger if exists games_stamp on public.games;
create trigger games_stamp before insert or update on public.games
  for each row execute function public.stamp_row();

drop trigger if exists games_denormalise on public.games;
create trigger games_denormalise before insert or update on public.games
  for each row execute function public.games_denormalise();

alter table public.games enable row level security;

drop policy if exists "games: members read" on public.games;
create policy "games: members read" on public.games
  for select to authenticated using (public.is_member());

drop policy if exists "games: members insert" on public.games;
create policy "games: members insert" on public.games
  for insert to authenticated with check (public.is_member());

drop policy if exists "games: members update" on public.games;
create policy "games: members update" on public.games
  for update to authenticated
  using (public.is_member()) with check (public.is_member());

-- Only the chair who created a game (or an admin) can delete it.
drop policy if exists "games: creator or admin delete" on public.games;
create policy "games: creator or admin delete" on public.games
  for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- ── Teams (shared rosters) ──────────────────────────────────────────────
-- One row per team name + division. Players are stored as JSON
-- [{ number, name }] — player ids are per-game and not shared.
create table if not exists public.teams (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  division             text not null default '',
  name_key             text generated always as (lower(btrim(name))) stored,
  division_key         text generated always as (lower(btrim(division))) stored,
  jersey_colour        text,
  number_colour        text,
  coach_name           text,
  assistant_coach_name text,
  captain_number       text,
  players              jsonb not null default '[]'::jsonb,
  created_by           uuid,
  created_by_email     text,
  created_at           timestamptz not null default now(),
  updated_by           uuid,
  updated_by_email     text,
  updated_at           timestamptz not null default now(),
  unique (name_key, division_key)
);

create index if not exists teams_name_key_idx on public.teams (name_key);

drop trigger if exists teams_stamp on public.teams;
create trigger teams_stamp before insert or update on public.teams
  for each row execute function public.stamp_row();

alter table public.teams enable row level security;

drop policy if exists "teams: members read" on public.teams;
create policy "teams: members read" on public.teams
  for select to authenticated using (public.is_member());

drop policy if exists "teams: members write" on public.teams;
create policy "teams: members write" on public.teams
  for insert to authenticated with check (public.is_member());

drop policy if exists "teams: members update" on public.teams;
create policy "teams: members update" on public.teams
  for update to authenticated
  using (public.is_member()) with check (public.is_member());

drop policy if exists "teams: admins delete" on public.teams;
create policy "teams: admins delete" on public.teams
  for delete to authenticated using (public.is_admin());

-- ── Team history ────────────────────────────────────────────────────────
-- Every roster save keeps the previous version, so a bad shared edit can
-- be rolled back from the dashboard.
create table if not exists public.team_versions (
  id          bigint generated always as identity primary key,
  team_id     uuid not null references public.teams (id) on delete cascade,
  snapshot    jsonb not null,
  replaced_at timestamptz not null default now(),
  replaced_by_email text
);

create or replace function public.teams_keep_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.team_versions (team_id, snapshot, replaced_by_email)
  values (old.id, to_jsonb(old), public.current_email());
  return new;
end;
$$;

drop trigger if exists teams_version on public.teams;
create trigger teams_version after update on public.teams
  for each row execute function public.teams_keep_version();

alter table public.team_versions enable row level security;

drop policy if exists "team_versions: members read" on public.team_versions;
create policy "team_versions: members read" on public.team_versions
  for select to authenticated using (public.is_member());

-- ── Membership check for the app ────────────────────────────────────────
-- Lets the app tell a signed-in user "you're not approved yet" instead of
-- silently showing empty lists.
grant execute on function public.is_member() to authenticated;
