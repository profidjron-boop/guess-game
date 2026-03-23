# GUESS_DUEL_BUILD_PLAN_v1_0

- Version: v1.0
- Status: active plan
- Date: 2026-03-23
- Project: Guess Duel

---

## 1) Header / Execution frame
Stack authority:
- Next.js 14 App Router + TypeScript
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

### Phase 2 — Lobby + Room waiting
Deliver:
- лобби: профиль (nick+avatar) + rooms list + create/join
- ожидание комнаты: code, invite link, онлайн, host badge, ready, host start

### Phase 3 — Core game mechanics
Deliver:
- игровой экран: timer, title, big button `СЕЙЧАС!`, lock after press
- расчет delta/press_time на клиенте, фиксация в `guesses`
- server-side фиксация winner/streak/points через `apply_round_results`
- modal результатов раунда + плавный переход

### Phase 4 — Realtime sync + leaderboard
Deliver:
- realtime channels на rooms/participants/rounds
- global leaderboard: топ-20 + фильтр спорт/киберспорт/все

### Phase 5 — UX polish + release readiness
Deliver:
- dark theme mobile-first layout
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
Выполнено: Phase 0..4 (первичная реализация полностью собрана).
Далее: strict+RLS+tests (Phase 5 follow-ups).

