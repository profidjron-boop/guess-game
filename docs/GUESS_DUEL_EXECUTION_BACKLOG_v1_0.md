# GUESS_DUEL_EXECUTION_BACKLOG

**Version:** v1.2  
**Date:** 2026-03-24  
**Project:** Guess Duel

Сводка эпиков и зависимостей. Детали — в соответствующих `EPIC_PACK_*`.

---

## 1) Статус эпиков

### Epic 01 — Foundation — **done**

- Структура Next.js, типы, `lib/supabase/client`, `lib/game/*`, хуки профиля и комнаты
- UI: `AvatarPicker`, `PlayerBadge`, тёмная тема

### Epic 02 — Database + Realtime — **done**

- `supabase/schema.sql`: таблицы, RLS, индексы, seed
- Функции: `compute_base_points`, `submit_guess_server`, `mark_round_event`, `apply_round_results`, `finalize_game`
- Realtime: подписки в `RoomScreen`

### Epic 03 — Fan UX + gameplay — **done**

- Маршруты матчей, комната, контекст матча на экранах
- Хост: старт игры, **`mark_round_event`**
- Ошибки RPC: **`lib/formatError.ts`**

### Epic 04 — Release — **done**

- README, `.env.example`, CI, Vercel
- RLS guest, `verify:desm`

---

## 2) Открыто (не блокирует релиз)

- Расширить **e2e** на полный сценарий: матч → комната → несколько раундов с эталоном хоста

---

## 3) Зависимости окружения

1. В Supabase применён актуальный **`supabase/schema.sql`**.
2. В Vercel заданы **`NEXT_PUBLIC_SUPABASE_URL`** и **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**.
3. Realtime включён для таблиц игрового цикла (см. корневой README).
4. У клиента создан профиль (localStorage) перед операциями в комнате.
