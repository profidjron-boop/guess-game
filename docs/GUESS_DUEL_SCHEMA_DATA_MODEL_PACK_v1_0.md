# GUESS_DUEL_SCHEMA_DATA_MODEL_PACK

**Version:** v1.2  
**Date:** 2026-03-24  
**Project:** Guess Duel

---

## 1) Source file

- `supabase/schema.sql`

---

## 2) Core entities

1. `rooms`

- `id`, `code`, `status` (`waiting|playing|finished`)
- `host_id`
- `current_round`, `total_rounds`
- `started_at`
- поля контекста матча: `match_slug`, `match_title`, `league`, `event_type`, `event_label`, …

2. `participants`

- `room_id` -> rooms
- `player_id` (local UUID)
- `nickname`, `avatar`
- `score` (game total), `streak`, `max_streak`
- `connected`, `ready`
- `selected_team`, `selected_team_side` (fan-flow)

3. `round_templates`

- 5 шаблонов: `round_number`, `title`, `category`, `duration_ms`

4. `rounds`

- `room_id`, `round_number`, `title`, `category`
- `duration_ms` — из шаблонов; **в RPC лимит по времени не используется** (нажатия и эталон хоста не режутся по `duration_ms`)
- **`event_time_ms`** — смещение в мс от `started_at` до **момента события на трансляции**; **`null`**, пока хост не вызвал `mark_round_event`
- `status` (`pending|running|ended`)
- `winner_player_id`
- опционально: `match_slug`, `event_label`, `round_context`

5. `guesses`

- `room_id`, `round_id`, `player_id`
- `press_time_ms` — серверное время относительно старта раунда
- **`delta_ms`** — `press_time_ms - event_time_ms`; **`null`**, пока эталон не зафиксирован
- `points`

6. `leaderboard`

- агрегат по игре: `total_score`, `avg_delta_ms`, `best_delta_ms`, …

---

## 3) Ключевые функции

- **`submit_guess_server`** — фиксация нажатия; дельта может быть `null` до эталона.
- **`mark_round_event`** — хост задаёт эталон, пересчитывает дельты, запускает **`apply_round_results`**, следующий раунд или **`finalize_game`**.
- **`apply_round_results`**, **`finalize_game`**, **`compute_base_points`** — см. `schema.sql`.

---

## 4) Indexes / constraints

- См. `schema.sql` — unique на `(room_id, round_id, player_id)` для guesses и т.д.

---

## 5) Grants

- На RPC для ролей `anon`, `authenticated`: см. конец `schema.sql` и `supabase/patch_rpc_grants.sql`.
