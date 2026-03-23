# GUESS_DUEL_BUILD_PLAN_v1_1

- Version: v1.1
- Status: executed
- Date: 2026-03-23
- Project: Guess Duel

---

## 1) Header / Execution frame

Stack authority:

- Next.js 16 App Router + TypeScript
- Tailwind CSS + Framer Motion
- Supabase Postgres + Realtime

Delivery mode: local run + Vercel deploy
Game scope guard:

- 5 раундов, одно нажатие за раунд
- кнопка `СЕЙЧАС!` в момент события (event_time_ms в БД)
- очки и winner раунда фиксируются на стороне сервера (DB function)

---

## 2) Phase plan (engineering order)

### Phase 0 — Architecture + repository baseline

Deliver:

- структура проекта `app/ components/ lib/ hooks/ types/`
- подключение Supabase client без падения на `next build`
- единый scoring/util modules

### Phase 1 — Database + SQL schema

Deliver:

- `supabase/schema.sql` (tables, indexes, scoring functions, seed round templates)
- seed: 5 раундов (Гол/Удар/Килл/Нокаут/Пойнт/Фраг)

### Phase 2 — Match-centric entry

Deliver:

- каталог матчей с фильтрами/поиском/статусами
- страница матча с выбором команды и события
- создание/вход в room из контекста выбранного матча

### Phase 3 — Core game mechanics

Deliver:

- игровой экран: `Match + League + Selected Team + Event` + `СЕЙЧАС!`
- server-side submit/scoring path через RPC + finalize functions
- modal результатов раунда с матчевым контекстом

### Phase 4 — Realtime sync + leaderboard(s)

Deliver:

- realtime channels на rooms/participants/rounds
- global leaderboard: топ-20 + фильтр спорт/киберспорт/все
- per-match leaderboard и список комнат на странице матча

### Phase 5 — UX polish + release readiness

Deliver:

- high-contrast dark theme mobile-first layout
- Framer Motion transitions
- README: env + install + supabase setup + vercel deploy
- checklist перед деплоем (см. test strategy)

---

## 3) Stop-gates (release BLOCKED if)

- realtime не синхронизирует состояние игры между вкладками
- нарушен расчет очков/серий/победителя раунда
- нет законченного интерфейса всех обязательных экранов

---

## 4) Current milestone

Выполнено: Phase 0..5.
Далее: только future improvements (live API, stream embed, расширенный e2e).
