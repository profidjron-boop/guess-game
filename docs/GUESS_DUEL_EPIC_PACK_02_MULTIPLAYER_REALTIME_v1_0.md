# GUESS_DUEL_EPIC_PACK_02_MULTIPLAYER_REALTIME_v1_0

Objective (Database + seed + realtime):

- сделать полноценный многопользовательский контур через Supabase Realtime.

Deliverables:

1. Supabase schema
   - `public.rooms`, `public.participants`, `public.round_templates`, `public.rounds`, `public.guesses`, `public.leaderboard`
2. Seed data
   - 5 round templates (Гол/Удар/Килл/Нокаут/Пойнт/Фраг)
3. Server functions
   - `submit_guess_server` (серверный press; `delta_ms` после эталона)
   - `mark_round_event` (хост фиксирует эталон → пересчёт дельт → `apply_round_results` / следующий раунд / `finalize_game`)
   - `apply_round_results` (winner + streak/multiplier + update participants.score)
   - `finalize_game` (write leaderboard row)
4. Realtime channels
   - UI подписывается на изменения `rooms`, `participants`, `rounds`

Status:

- implemented (см. `supabase/schema.sql` и realtime hook/logic в `RoomScreen`).

Follow-ups:

- внешний сигнал эфира вместо ручной отметки хоста (future scope).

Closed:

- strict серверный press через `submit_guess_server`; RLS guest-mode в `schema.sql`.
