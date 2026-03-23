# GUESS_DUEL_DOCUMENT_INDEX

**Version:** v1.3  
**Date:** 2026-03-24  
**Product:** Guess Duel  
**Purpose:** единый указатель всей проектной документации в `docs/`

**Быстрый старт:** [`README.md`](./README.md) в этой папке.

**Проверка перед релизом:** [`DESM_VERIFY.md`](./DESM_VERIFY.md) → `npm run verify:desm`.

---

## 1) Стратегия и состояние

| #   | Файл                               | Описание                                            |
| --- | ---------------------------------- | --------------------------------------------------- |
| 1   | `GUESS_DUEL_PROJECT_STATE_v1_0.md` | Режим проекта, ограничения, стек, delivery snapshot |
| 2   | `GUESS_DUEL_READY_TZ_v1_0.md`      | Границы релизной готовности (scope in/out)          |
| 3   | `GUESS_DUEL_BUILD_PLAN_v1_0.md`    | Исторический план фаз (выполнен)                    |

---

## 2) Планирование и эпики

| #   | Файл                                                   | Описание                            |
| --- | ------------------------------------------------------ | ----------------------------------- |
| 4   | `GUESS_DUEL_EXECUTION_BACKLOG_v1_0.md`                 | Статус эпиков и зависимости         |
| 5   | `GUESS_DUEL_EPIC_PACK_01_FOUNDATION_v1_0.md`           | Foundation: структура репо, UI-база |
| 6   | `GUESS_DUEL_EPIC_PACK_02_MULTIPLAYER_REALTIME_v1_0.md` | БД, RPC, Realtime                   |
| 7   | `GUESS_DUEL_EPIC_PACK_03_UI_GAME_MECHANICS_v1_0.md`    | Fan-flow, комната, игра             |
| 8   | `GUESS_DUEL_EPIC_PACK_04_RELEASE_DEPLOY_v1_0.md`       | Релиз, RLS, проверки                |

---

## 3) Архитектура, данные, контракты

| #   | Файл                                        | Описание                                                     |
| --- | ------------------------------------------- | ------------------------------------------------------------ |
| 9   | `GUESS_DUEL_ADR_PACK_v1_0.md`               | Решения (guest mode, RPC, эталон хоста, без таймера окна)    |
| 10  | `GUESS_DUEL_SCHEMA_DATA_MODEL_PACK_v1_0.md` | Сущности Supabase, поля раундов/guesses                      |
| 11  | `GUESS_DUEL_API_CONTRACT_PACK_v1_0.md`      | Realtime + RPC: `submit_guess_server`, `mark_round_event`, … |

---

## 4) UI и качество

| #   | Файл                                    | Описание                                        |
| --- | --------------------------------------- | ----------------------------------------------- |
| 12  | `GUESS_DUEL_UI_SYSTEM_RULES_v1_0.md`    | Правила экранов, second-screen, хост            |
| 13  | `GUESS_DUEL_TEST_STRATEGY_PACK_v1_0.md` | Пирамида тестов, smoke, зафиксированные прогоны |

---

## 5) Рекомендуемый порядок чтения

1. [`README.md`](./README.md) (этот каталог)
2. Project State → Ready TZ → ADR Pack
3. Schema → API Contract
4. UI System Rules → Test Strategy
5. Эпики и backlog — по необходимости к расследованию истории

---

## 6) Сведения о релизе

- **Production:** `https://guess-duel.vercel.app`
- **Supabase:** актуальный `supabase/schema.sql` (таблицы + RPC + RLS + GRANT)
- **QA:** `npm run verify:desm` (см. `DESM_VERIFY.md`)

---

## 7) Лицензирование

- Корень: `LICENSE`, `NOTICE`, `package.json` → `UNLICENSED`
- Контакт: `djron11@mail.ru`
