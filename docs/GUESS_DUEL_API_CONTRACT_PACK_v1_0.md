# GUESS_DUEL_API_CONTRACT_PACK

**Version:** v1.2  
**Date:** 2026-03-24  
**Project:** Guess Duel

---

## 1) Integration surface

Продукт не использует кастомные REST endpoints. Контракт: Supabase client — таблицы, Realtime, RPC.

---

## 2) Realtime contract (channels)

В `RoomScreen` подписки:

- `rooms` filter: `id=eq.<roomId>`
- `participants` filter: `room_id=eq.<roomId>`
- `rounds` filter: `room_id=eq.<roomId>`

Refresh с throttling (~250ms).

---

## 3) RPC contract (server truth)

### 1. `submit_guess_server(p_room_id, p_round_id, p_player_id)`

- Вызывается любым участником при нажатии «СЕЙЧАС!».
- Считает `press_time_ms` от серверных часов относительно `rounds.started_at`.
- Пока **`event_time_ms` у раунда `null`** (эталон ещё не зафиксирован), вставляет строку в `guesses` с **`delta_ms = null`**.
- **Лимита по `rounds.duration_ms` нет** — нажатие не отклоняется из‑за «истечения окна».
- После фиксации эталона хостом (`mark_round_event`) дельты пересчитываются на сервере; при повторном нажатии до эталона действует `already_guessed`.

### 2. `mark_round_event(p_room_id, p_round_id, p_host_id)`

- Вызывается **только хостом** комнаты (`rooms.host_id = p_host_id`).
- Задаёт **`event_time_ms`** как момент на трансляции (демо: время нажатия хоста относительно `started_at`; позже можно заменить внешним API).
- **Лимита по `duration_ms` нет** — эталон можно зафиксировать в любой момент после старта раунда.
- Обновляет `delta_ms` у всех нажатий раунда, вызывает **`apply_round_results`**, переводит раунд в `ended`, открывает следующий `pending` раунд или завершает игру (**`finalize_game`**).

### 3. `apply_round_results(p_room_id, p_round_id)`

- Обычно вызывается **изнутри** `mark_round_event`, не клиентом в цикле.
- Обновляет очки, streak, `winner_player_id` (по минимальному `abs(delta_ms)` среди строк с **не-null** `delta_ms`).

### 4. `finalize_game(p_room_id)`

- Вызывается **изнутри** `mark_round_event` при завершении последнего раунда (или может вызываться отдельно в особых сценариях).
- Upsert в `leaderboard`.

### 5. Вспомогательные

- `compute_base_points(delta_ms)` — используется в цепочке подсчёта очков.

---

## 4) Client write contract

- `participants.ready` — тоггл в лобби.
- Нажатие «СЕЙЧАС!» — только через **`submit_guess_server`** (не прямой insert в `guesses` с клиента как источнике истины).
- Эталон события — только **`mark_round_event`** (хост).

---

## 5) Consistency expectations

- UI может опережать отображение, но **очки и победитель раунда** определяются после фиксации эталона и RPC.
- Клиент **не** продвигает раунды через `sleep(duration)`; продвижение — следствие **`mark_round_event`** и обновлений в БД.
- Ошибки RPC в UI: **`formatUnknownError`** (`lib/formatError.ts`).
- **GRANT EXECUTE** на перечисленные RPC для ролей `anon`, `authenticated` — в конце `supabase/schema.sql`.
