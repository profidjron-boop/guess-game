# GUESS_DUEL_API_CONTRACT_PACK_v1_0

Version: v1.0  
Date: 2026-03-23  
Project: Guess Duel

---

## 1) Integration surface

Данный продукт не использует кастомные REST endpoints.
Контракт строится вокруг Supabase client calls:

- CRUD по таблицам
- realtime подписки
- RPC вызовы DB functions

---

## 2) Realtime contract (channels)

В `RoomScreen` UI подписывается на изменение:

- `rooms` filter: `id=eq.<roomId>`
- `participants` filter: `room_id=eq.<roomId>`
- `rounds` filter: `room_id=eq.<roomId>`

После событий вызывается refresh с throttling (250ms).

---

## 3) RPC contract (server truth)

1. `apply_round_results(p_room_id, p_round_id)`

- вызывается хостом при завершении конкретного раунда
- обновляет:
  - `rounds.status`, `rounds.winner_player_id`
  - `participants.score`, `participants.streak`, `participants.max_streak`

2. `finalize_game(p_room_id)`

- вызывается хостом после финального раунда
- upsert в `leaderboard`

---

## 4) Client write contract

Пишутся:

- `participants.ready` (тоггл у игрока)
- `guesses` (press_time_ms и delta_ms) при нажатии `СЕЙЧАС!`

---

## 5) Consistency expectations

- UI может отображать текущий тайминг/результаты мгновенно,
  но финальные winner/streak/score должны быть результатом DB functions (RPC).
