# GUESS_DUEL_SCHEMA_DATA_MODEL_PACK_v1_0

Version: v1.0  
Date: 2026-03-23  
Project: Guess Duel

---

## 1) Source file
- `supabase/schema.sql`

---

## 2) Core entities
1) `rooms`
- `id`, `code`, `status` (`waiting|playing|finished`)
- `host_id`
- `current_round`, `total_rounds`
- `started_at`

2) `participants`
- `room_id` -> rooms
- `player_id` (local UUID)
- `nickname`, `avatar`
- `score` (game total), `streak`, `max_streak`
- `connected`, `ready`

3) `round_templates`
- 5 шаблонов раундов: `round_number`, `title`, `category`, `duration_ms`

4) `rounds`
- `room_id`
- `round_number`
- `title`, `category`
- `duration_ms`
- `event_time_ms` (relative to `round.started_at`)
- `status` (`pending|running|ended`)
- `winner_player_id`

5) `guesses`
- `room_id`, `round_id`
- `player_id`
- `press_time_ms` (computed at press)
- `delta_ms` = press - event
- `points`

6) `leaderboard`
- `room_id`, `player_id`
- `nickname`, `avatar`
- `total_score`, `avg_delta_ms`, `best_delta_ms`
- `category`, `played_at`

---

## 3) Indexes/constraints
- unique:
  - `rooms.code`
  - `participants(room_id, player_id)`
  - `rounds(room_id, round_number)`
  - `guesses(room_id, round_id, player_id)`
  - `leaderboard(room_id, player_id)`
- indexes:
  - rooms(status), rooms(code)
  - participants(room_id), participants(room_id, connected)
  - rounds(room_id, round_number), rounds(status)
  - guesses(round_id), guesses(player_id)
  - leaderboard(category), leaderboard(total_score desc), leaderboard(played_at desc)

---

## 4) Scoring functions
1) `compute_base_points(delta_ms)`
- thresholds windows:
  - 0-500 => 1000
  - 501-1000 => 750
  - 1001-2000 => 500
  - 2001-5000 => 250
  - >5000 => 0
- early press penalty: delta_ms < 0 => -100

2) `apply_round_results(room_id, round_id)`
- mark round ended
- set winner_player_id (min abs delta)
- update participants score + streak/multiplier

3) `finalize_game(room_id)`
- upsert into leaderboard

