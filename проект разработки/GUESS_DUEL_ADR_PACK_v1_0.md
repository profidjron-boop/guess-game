# GUESS_DUEL_ADR_PACK_v1_0

Version: v1.0  
Date: 2026-03-23  
Project: Guess Duel

---

## ADR-01: Supabase guest mode (no auth)
Decision:
- использовать `player_id` как локальный UUID (через `crypto.randomUUID`)
- хранить ник/аватар в `localStorage`
- использовать Supabase tables без регистрации аккаунтов

Pros:
- быстрый вход для зрителей/гостей
- минимальный UX friction

Cons / risks:
- anti-cheat зависит от клиентских press/delta вычислений
- при включении RLS потребуются guest policies

Status:
- accepted for v1 release

---

## ADR-02: Points/winner computation in DB function
Decision:
- winner раунда и базовые очки/стрик обновляются через DB function `apply_round_results`

Pros:
- единая серверная истина для расчёта winner/streak
- меньше расхождений UI

Cons / risks:
- `press_time_ms` и `delta_ms` считаются на клиенте
- для strict anti-cheat потребуется серверное вычисление press timing

---

## ADR-03: Realtime channel on data tables
Decision:
- подписка на изменения `rooms`, `participants`, `rounds` через Supabase Realtime

---

## ADR-04: Build safety without env vars
Decision:
- Supabase client wrapper не кидает exception при отсутствии env во время `next build`

