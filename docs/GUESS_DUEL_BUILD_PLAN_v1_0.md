# GUESS_DUEL_BUILD_PLAN

**Version:** v1.2 (архивный снимок)  
**Status:** executed — все фазы закрыты  
**Date:** 2026-03-24  
**Project:** Guess Duel

Документ фиксирует **исторический** порядок работ. Текущее состояние продукта — в **`GUESS_DUEL_PROJECT_STATE_v1_0.md`** и **`docs/README.md`**.

---

## 1) Стек

- Next.js 16 App Router, TypeScript, Tailwind, Framer Motion
- Supabase Postgres + Realtime
- Vercel

**Инварианты механики (финал):**

- 5 раундов, одно нажатие **`СЕЙЧАС!`** на игрока на раунд
- Эталон **`event_time_ms`** — хост, **`mark_round_event`**
- Очки / победитель — серверные функции
- Без таймера окна раунда в UI; без лимита по **`duration_ms`** в RPC нажатий и эталона

---

## 2) Фазы (выполнено)

| Фаза | Содержание                                                                                   |
| ---- | -------------------------------------------------------------------------------------------- |
| 0    | Каркас: `app/`, `components/`, `lib/`, `hooks/`, `types/`; Supabase client без падения build |
| 1    | `supabase/schema.sql`: таблицы, индексы, RPC, seed `round_templates`                         |
| 2    | Каталог матчей, страница матча, вход в комнату с контекстом матча                            |
| 3    | Игровой экран, RPC submit / mark / apply / finalize, модалки                                 |
| 4    | Realtime, leaderboard                                                                        |
| 5    | Тема, motion, README, DESM, деплой                                                           |

---

## 3) Stop-gates (исторические)

Релиз был бы заблокирован при: поломке realtime, неверном подсчёте очков, отсутствии обязательных экранов — на момент закрытия плана это проверено.

---

## 4) Дальнейшая работа

См. **Future improvements** в корневом `README.md` и раздел open questions в **Project State**.
