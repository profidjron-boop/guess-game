# GUESS_DUEL_ADR_PACK_v1_0

Version: v1.1  
Date: 2026-03-24  
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

- при включении RLS потребуются guest policies
- идентичность гостя по `player_id` всё ещё на стороне клиента (не полноценная аутентификация)

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

---

## ADR-05: Broadcast anchor for round event (host)

Decision:

- момент события на трансляции в демо фиксирует **хост** через RPC `mark_round_event`
- до отметки `rounds.event_time_ms` и `guesses.delta_ms` могут быть `null`
- после отметки сервер пересчитывает дельты и вызывает `apply_round_results` / переход раунда / `finalize_game`

Pros:

- second-screen не претендует на синхронизацию с реальным эфиром без внешнего сигнала
- единая серверная истина для winner и очков

Cons / risks:

- доверие к хосту как к «рефери» момента (приемлемо для демо/дружеской игры)
