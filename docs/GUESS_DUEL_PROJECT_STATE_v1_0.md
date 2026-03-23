# GUESS_DUEL_PROJECT_STATE

**Project:** Guess Duel  
**Type:** browser multiplayer, guest mode (no auth)  
**Audience:** зрители спортивных и киберспортивных трансляций

**Stage:** fan-mode реализован  
**Status:** release-ready  
**Owner:** greka

**Updated:** 2026-03-24 (документация v1.3, механика без таймера окна)

---

## 1) Продукт

**Цель:** second-screen соревнование в точности момента события (гол, килл и т.д.) по выбранному матчу и команде.

**Основные действия пользователя:**

- каталог матчей → карточка матча → выбор стороны и типа события
- комната по коду/ссылке с контекстом матча
- игровой экран: **`СЕЙЧАС!`** + у хоста — **эталон на эфире** (`mark_round_event`)
- результаты раундов, финал, глобальный leaderboard

---

## 2) Источники правды

| Артефакт       | Файл                                        |
| -------------- | ------------------------------------------- |
| Границы scope  | `GUESS_DUEL_READY_TZ_v1_0.md`               |
| Решения        | `GUESS_DUEL_ADR_PACK_v1_0.md`               |
| Схема БД       | `GUESS_DUEL_SCHEMA_DATA_MODEL_PACK_v1_0.md` |
| RPC / Realtime | `GUESS_DUEL_API_CONTRACT_PACK_v1_0.md`      |

Указатель всех документов: `GUESS_DUEL_DOCUMENT_INDEX_v1_0.md`.

---

## 3) Что сделано (snapshot)

1. Поток: **matches → match → room → gameplay → final → leaderboard**.
2. Матчевый контекст в room / game / results / final.
3. Supabase: `matches`, `match_event_templates`, поля контекста в `rooms` / `participants` / `rounds`.
4. Realtime на `rooms`, `participants`, `rounds`; дебаунс обновлений в UI.
5. **Эталон на эфире:** только хост, RPC `mark_round_event`; до отметки `event_time_ms` и `delta_ms` (у guess) могут быть `null`.
6. **Без таймера окна раунда** в интерфейсе; в RPC **нет** отсечения по `duration_ms` для `submit_guess_server` / `mark_round_event` (значение в шаблонах/раундах остаётся данными).
7. Сообщения об ошибках RPC через **`lib/formatError.ts`** (нет сырого `[object Object]`).
8. Production: **`https://guess-duel.vercel.app`**.

---

## 4) Неготово нарушать

- Тёмная тема, контраст, mobile-first, крупная кнопка **`СЕЙЧАС!`**.
- Цепочка экранов: matches → match → lobby room → playing → round modal → finished → leaderboard.
- Очки и победитель раунда — **только** через серверные функции (RPC/БД).
- 5 раундов за игру, **одно** нажатие `СЕЙЧАС!` на раунд на игрока.

---

## 5) Открытые улучшения (не блокеры)

1. Расширить e2e по fan-flow (матч → комната → несколько раундов).
2. Внешний сигнал эфира / API матча вместо ручного эталона хоста.
3. Наблюдаемость (ошибки/метрики) в production.

---

## 6) Релиз и соответствие

- **URL:** `https://guess-duel.vercel.app`
- **Ветка:** `main`
- **База:** применён `supabase/schema.sql` (включая актуальные тела функций).
- **Env (Vercel):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Проверки:** `npm run verify:desm` — см. `docs/DESM_VERIFY.md`.
- **Лицензия:** проприетарная (`UNLICENSED`, см. `LICENSE`).
