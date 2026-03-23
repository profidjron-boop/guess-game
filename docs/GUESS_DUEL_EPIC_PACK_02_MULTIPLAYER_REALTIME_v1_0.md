# GUESS_DUEL_EPIC_PACK_02 — Multiplayer + Realtime

**Version:** v1.2  
**Date:** 2026-03-24

**Objective:** данные Supabase, RPC, синхронизация комнаты.

---

## Deliverables

1. Схема: `rooms`, `participants`, `round_templates`, `rounds`, `guesses`, `leaderboard` (+ match-centric таблицы при использовании каталога из БД).
2. Seed: шаблоны раундов в `round_templates`.
3. Функции: **`submit_guess_server`**, **`mark_round_event`**, **`apply_round_results`**, **`finalize_game`**, **`compute_base_points`**.
4. **Без** отсечения по `duration_ms` в `submit_guess_server` / `mark_round_event` (см. актуальный `schema.sql`).
5. Realtime: подписки в **`RoomScreen`** на `rooms`, `participants`, `rounds`.
6. RLS для guest — в **`supabase/schema.sql`**.

---

## Статус

**Done** — см. `supabase/schema.sql` и `components/RoomScreen.tsx`.

---

## Follow-up (не в scope v1)

- Внешний сигнал эфира вместо ручного эталона хоста.
