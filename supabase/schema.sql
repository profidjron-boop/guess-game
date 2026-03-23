-- Guess Duel (Next.js + Supabase)
-- Import this file into Supabase SQL editor.
-- Notes:
-- - This schema assumes "guest players" (no Supabase Auth registration).
-- - RLS is left OFF by default for local/development showcase.
-- - If you enable RLS, update policies accordingly.

-- Extensions (Supabase usually has pgcrypto enabled; keep this safe).
create extension if not exists pgcrypto;

-----------------------
-- Rooms & Players
-----------------------

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  host_id uuid not null,
  current_round integer not null default 0,
  total_rounds integer not null default 5,
  created_at timestamptz not null default now(),
  started_at timestamptz
);

create index if not exists rooms_status_idx on public.rooms (status);
create index if not exists rooms_code_idx on public.rooms (code);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null,
  nickname text not null,
  avatar text not null,
  score integer not null default 0,
  streak integer not null default 0,
  max_streak integer not null default 0,
  connected boolean not null default true,
  ready boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, player_id)
);

create index if not exists participants_room_idx on public.participants (room_id);
create index if not exists participants_connected_idx on public.participants (room_id, connected);

-----------------------
-- Rounds
-----------------------

-- Canonical template (5 rounds). Used when host starts a new game.
create table if not exists public.round_templates (
  round_number integer primary key,
  title text not null,
  category text not null check (category in ('sport', 'cyber')),
  duration_ms integer not null check (duration_ms > 0)
);

insert into public.round_templates (round_number, title, category, duration_ms)
values
  (1, 'Гол', 'sport', 10000),
  (2, 'Удар в голову', 'sport', 10000),
  (3, 'Килл', 'cyber', 10000),
  (4, 'Нокаут', 'sport', 10000),
  (5, 'Пойнт/Фраг', 'cyber', 10000)
on conflict (round_number) do nothing;

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null,
  title text not null,
  category text not null check (category in ('sport', 'cyber')),
  duration_ms integer not null check (duration_ms > 0),
  event_time_ms integer, -- relative to round.started_at; the "actual" moment
  status text not null default 'pending' check (status in ('pending', 'running', 'ended')),
  started_at timestamptz,
  ended_at timestamptz,
  winner_player_id uuid,
  unique (room_id, round_number)
);

create index if not exists rounds_room_round_idx on public.rounds (room_id, round_number);
create index if not exists rounds_status_idx on public.rounds (status);

-----------------------
-- Guesses
-----------------------

create table if not exists public.guesses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null,
  press_time_ms integer not null, -- relative to rounds.started_at (client computed)
  delta_ms integer not null,       -- press_time_ms - event_time_ms (client computed)
  points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, round_id, player_id)
);

create index if not exists guesses_round_idx on public.guesses (round_id);
create index if not exists guesses_player_idx on public.guesses (player_id);

-----------------------
-- Leaderboard
-----------------------

-- Stores per-game aggregated record for each player.
-- Global leaderboard can aggregate these records if needed.
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null,
  nickname text not null,
  avatar text not null,
  total_score integer not null,
  avg_delta_ms integer not null,
  best_delta_ms integer not null,
  category text not null check (category in ('sport', 'cyber')),
  played_at timestamptz not null default now(),
  unique (room_id, player_id)
);

create index if not exists leaderboard_category_idx on public.leaderboard (category);
create index if not exists leaderboard_total_score_idx on public.leaderboard (total_score desc);
create index if not exists leaderboard_played_at_idx on public.leaderboard (played_at desc);

-----------------------
-- Scoring helpers
-----------------------

create or replace function public.compute_base_points(p_delta_ms integer)
returns integer
language plpgsql
as $$
declare
  abs_delta integer;
begin
  -- Early press: delta_ms < 0 => penalty
  if p_delta_ms < 0 then
    return -100;
  end if;

  abs_delta := abs(p_delta_ms);

  if abs_delta <= 500 then
    return 1000;
  elsif abs_delta <= 1000 then
    return 750;
  elsif abs_delta <= 2000 then
    return 500;
  elsif abs_delta <= 5000 then
    return 250;
  else
    return 0;
  end if;
end;
$$;

-- Apply results of a finished round:
-- - computes points for each participant (missing guess => 0, streak reset)
-- - updates participants.score, participants.streak, participants.max_streak
-- - sets rounds.winner_player_id
create or replace function public.apply_round_results(p_room_id uuid, p_round_id uuid)
returns void
language plpgsql
as $$
begin
  -- Mark round ended (idempotent-ish)
  update public.rounds
    set status = 'ended',
        ended_at = coalesce(ended_at, now())
  where id = p_round_id and room_id = p_room_id and status <> 'ended';

  -- Winner: minimal absolute delta among guesses
  -- (Missing guesses won't win.)
  with ranked as (
    select
      g.player_id,
      abs(g.delta_ms) as abs_delta,
      g.press_time_ms,
      row_number() over (order by abs(g.delta_ms) asc, g.press_time_ms asc) as rn
    from public.guesses g
    where g.round_id = p_round_id
  )
  update public.rounds r
  set winner_player_id = x.player_id
  from (
    select player_id from ranked where rn = 1
  ) x
  where r.id = p_round_id;

  -- Compute points + streak for each participant using their OLD streak.
  -- This ensures consecutive-exact multipliers are correct.
  with finalized as (
    select
      p.room_id,
      p.player_id,
      p.streak as old_streak,
      case
        when g.delta_ms is null then false
        when abs(g.delta_ms) <= 1000 and g.delta_ms >= 0 then true
        else false
      end as is_exact,
      case
        when g.delta_ms is null then 0
        else public.compute_base_points(g.delta_ms)
      end as base_points,
      case
        when g.delta_ms is null then 0
        when abs(g.delta_ms) <= 1000 and g.delta_ms >= 0 then p.streak + 1
        else 0
      end as new_streak
    from public.participants p
    left join public.guesses g
      on g.room_id = p.room_id
     and g.round_id = p_round_id
     and g.player_id = p.player_id
    where p.room_id = p_room_id
  ),
  scored as (
    select
      room_id,
      player_id,
      old_streak,
      is_exact,
      base_points,
      new_streak,
      case
        when new_streak = 2 then 1.5
        when new_streak >= 3 then 2.0
        else 1.0
      end as multiplier,
      trunc((base_points::numeric) * (
        case
          when new_streak = 2 then 1.5
          when new_streak >= 3 then 2.0
          else 1.0
        end
      ) )::integer as round_points
    from finalized
  )
  -- Update participants (authoritative scoreboard)
  update public.participants p
  set
    score = p.score + s.round_points,
    streak = s.new_streak,
    max_streak = greatest(p.max_streak, s.new_streak)
  from scored s
  where p.room_id = s.room_id and p.player_id = s.player_id;

  -- Store per-round points for guessed players (used in round results screen)
  update public.guesses g
  set points = s.round_points
  from scored s
  where g.room_id = s.room_id
    and g.round_id = p_round_id
    and g.player_id = s.player_id
    and g.round_id = p_round_id;
end;
$$;

-- Finalize game and upsert into leaderboard:
-- - total_score: participants.score
-- - avg_delta_ms / best_delta_ms: from guesses for all rounds of the room (using abs(delta_ms))
-- - category: category from the round where the player achieved best_delta
create or replace function public.finalize_game(p_room_id uuid)
returns void
language plpgsql
as $$
declare
  v_now timestamptz := now();
begin
  -- For each participant compute stats from their guesses.
  with per_player as (
    select
      p.player_id,
      p.nickname,
      p.avatar,
      p.score as total_score,
      coalesce(round(avg(abs(g.delta_ms)))::int, 0) as avg_delta_ms,
      coalesce(min(abs(g.delta_ms))::int, 0) as best_delta_ms,
      (
        select r.category
        from public.guesses g2
        join public.rounds r on r.id = g2.round_id
        where g2.room_id = p_room_id and g2.player_id = p.player_id
        order by abs(g2.delta_ms) asc
        limit 1
      ) as category
    from public.participants p
    left join public.guesses g on g.room_id = p_room_id and g.player_id = p.player_id
    where p.room_id = p_room_id
    group by p.player_id, p.nickname, p.avatar, p.score
  )
  insert into public.leaderboard (
    room_id, player_id, nickname, avatar, total_score, avg_delta_ms, best_delta_ms, category, played_at
  )
  select
    p_room_id,
    player_id,
    nickname,
    avatar,
    total_score,
    avg_delta_ms,
    best_delta_ms,
    coalesce(category, 'sport') as category,
    v_now
  from per_player
  on conflict (room_id, player_id) do update
  set
    nickname = excluded.nickname,
    avatar = excluded.avatar,
    total_score = excluded.total_score,
    avg_delta_ms = excluded.avg_delta_ms,
    best_delta_ms = excluded.best_delta_ms,
    category = excluded.category,
    played_at = excluded.played_at;
end;
$$;

-- Server-side guess submit:
-- Computes press_time_ms and delta_ms from DB time, not from client payload.
create or replace function public.submit_guess_server(
  p_room_id uuid,
  p_round_id uuid,
  p_player_id uuid
)
returns public.guesses
language plpgsql
as $$
declare
  v_round public.rounds%rowtype;
  v_press_time_ms integer;
  v_delta_ms integer;
  v_row public.guesses%rowtype;
begin
  select *
    into v_round
  from public.rounds
  where id = p_round_id
    and room_id = p_room_id
  for update;

  if not found then
    raise exception 'round_not_found';
  end if;

  if v_round.status <> 'running' then
    raise exception 'round_not_running';
  end if;

  if v_round.started_at is null or v_round.event_time_ms is null then
    raise exception 'round_not_ready';
  end if;

  if not exists (
    select 1
    from public.participants p
    where p.room_id = p_room_id and p.player_id = p_player_id
  ) then
    raise exception 'participant_not_in_room';
  end if;

  if exists (
    select 1
    from public.guesses g
    where g.room_id = p_room_id
      and g.round_id = p_round_id
      and g.player_id = p_player_id
  ) then
    raise exception 'already_guessed';
  end if;

  v_press_time_ms := greatest(
    0,
    floor(extract(epoch from (clock_timestamp() - v_round.started_at)) * 1000)::integer
  );

  -- Do not accept guesses after round duration window.
  if v_press_time_ms > v_round.duration_ms then
    raise exception 'too_late';
  end if;

  v_delta_ms := v_press_time_ms - v_round.event_time_ms;

  insert into public.guesses (
    room_id,
    round_id,
    player_id,
    press_time_ms,
    delta_ms,
    points
  )
  values (
    p_room_id,
    p_round_id,
    p_player_id,
    v_press_time_ms,
    v_delta_ms,
    0
  )
  returning * into v_row;

  return v_row;
end;
$$;

-----------------------
-- RLS
-----------------------
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.round_templates enable row level security;
alter table public.rounds enable row level security;
alter table public.guesses enable row level security;
alter table public.leaderboard enable row level security;

-- Guest-friendly policies (anon/authenticated) for browser multiplayer use.
drop policy if exists rooms_rw_all on public.rooms;
create policy rooms_rw_all
on public.rooms
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists participants_rw_all on public.participants;
create policy participants_rw_all
on public.participants
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists round_templates_read_all on public.round_templates;
create policy round_templates_read_all
on public.round_templates
for select
to anon, authenticated
using (true);

drop policy if exists rounds_rw_all on public.rounds;
create policy rounds_rw_all
on public.rounds
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists guesses_rw_all on public.guesses;
create policy guesses_rw_all
on public.guesses
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists leaderboard_read_all on public.leaderboard;
create policy leaderboard_read_all
on public.leaderboard
for select
to anon, authenticated
using (true);

drop policy if exists leaderboard_insert_all on public.leaderboard;
create policy leaderboard_insert_all
on public.leaderboard
for insert
to anon, authenticated
with check (true);

drop policy if exists leaderboard_update_all on public.leaderboard;
create policy leaderboard_update_all
on public.leaderboard
for update
to anon, authenticated
using (true)
with check (true);

-- -----------------------------------
-- Match-centric expansion (second-screen fan mode)
-- -----------------------------------

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  home_team text not null,
  away_team text not null,
  home_team_logo text,
  away_team_logo text,
  category text not null,
  league text not null,
  status text not null check (status in ('live', 'upcoming', 'finished')),
  starts_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.match_event_templates (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type text not null,
  label text not null,
  description text,
  team_scope text not null default 'selected_team' check (team_scope in ('home', 'away', 'selected_team', 'neutral')),
  created_at timestamptz not null default now()
);

alter table public.rooms add column if not exists match_slug text;
alter table public.rooms add column if not exists match_title text;
alter table public.rooms add column if not exists match_home_team text;
alter table public.rooms add column if not exists match_away_team text;
alter table public.rooms add column if not exists match_category text;
alter table public.rooms add column if not exists league text;
alter table public.rooms add column if not exists event_type text;
alter table public.rooms add column if not exists event_label text;

alter table public.participants add column if not exists selected_team text;
alter table public.participants add column if not exists selected_team_side text check (selected_team_side in ('home', 'away'));

alter table public.rounds add column if not exists match_slug text;
alter table public.rounds add column if not exists event_type text;
alter table public.rounds add column if not exists event_label text;
alter table public.rounds add column if not exists round_context jsonb default '{}'::jsonb;

alter table public.matches enable row level security;
alter table public.match_event_templates enable row level security;

drop policy if exists matches_read_all on public.matches;
create policy matches_read_all
on public.matches
for select
to anon, authenticated
using (true);

drop policy if exists match_event_templates_read_all on public.match_event_templates;
create policy match_event_templates_read_all
on public.match_event_templates
for select
to anon, authenticated
using (true);

-----------------------
-- RPC: allow browser clients (anon) to call server functions
-----------------------
-- Without these, supabase.rpc(...) from the Next.js app can fail with
-- "permission denied for function" while Realtime still looks "connected".
grant execute on function public.compute_base_points(integer) to anon, authenticated;
grant execute on function public.apply_round_results(uuid, uuid) to anon, authenticated;
grant execute on function public.finalize_game(uuid) to anon, authenticated;
grant execute on function public.submit_guess_server(uuid, uuid, uuid) to anon, authenticated;

-----------------------
-- Recommended: set FK constraints
-----------------------
-- (Already defined with REFERENCES ... ON DELETE CASCADE)

