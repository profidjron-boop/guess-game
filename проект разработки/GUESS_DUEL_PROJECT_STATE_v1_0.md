# GUESS_DUEL_PROJECT_STATE_v1_0

Project: Guess Duel  
Client: viewers (sports + esports broadcasts)  
Project type: browser multiplayer game (guest mode, no auth)

Stage: implementation (core slices in progress / completed)  
Status: active  
Owner: greka  
Date: 2026-03-23  
Updated: 2026-03-23

---

## 1) Product discovery
Goal: дать зрителям соревноваться в точности угадывания момента события (нажатие `СЕЙЧАС!`) с начислением очков/серий и итоговым лидербордом.

Primary user actions:
- вход в лобби с ником и аватаром
- создание/вход в комнату
- хост запускает игру
- игрок нажимает `СЕЙЧАС!` в каждом раунде
- просмотр результатов раунда и финального пьедестала

---

## 2) Current governing artifact
Текущий governing TZ:
- `GUESS_DUEL_READY_TZ_v1_0.md`

Архитектурные и data governing документы:
- `GUESS_DUEL_SCHEMA_DATA_MODEL_PACK_v1_0.md`
- `GUESS_DUEL_ADR_PACK_v1_0.md`
- `GUESS_DUEL_API_CONTRACT_PACK_v1_0.md`

---

## 3) Current delivery shape (slice snapshot)
Выполнено (MVP production-ready по ТЗ, с визуальным интерфейсом):
1) Next.js 14 + TS + Tailwind + Framer Motion каркас приложения
2) UI экраны: лобби, ожидание комнаты, игровой экран, результаты раунда, итоговый экран, глобальный leaderboard
3) Supabase schema и seed раундов
4) Supabase realtime синхронизация комнат/участников/раундов (channels на события изменения)
5) Серверные функции для winner раунда и начисления streak/очков: `apply_round_results`, `finalize_game`

---

## 4) Constraints / non-negotiables
- Dark theme по умолчанию
- Mobile-first интерфейс, крупная кнопка `СЕЙЧАС!`
- Stage-chain: lobby -> room wait -> playing -> round results -> finished -> leaderboard
- Истина по очкам и winner раунда: вычисление и фиксация на сервере (RPC/DB function)
- Rounds: 5 раундов, одно нажатие за раунд

---

## 5) Blocking open questions
Критичных блокеров по архитектуре нет.

Операционные шаги до финального релиза:
1) Убедиться, что `supabase/schema.sql` применен в целевом проекте Supabase.
2) Зафиксировать release evidence (staging/prod URL + smoke-check).
3) Приоритизировать automated e2e для основных пользовательских потоков.

---

## 6) Git traceability policy (future)
Коммиты на GitHub и release tags будут добавлены позже. План:
- коммитить milestone boundary (schema, UI, realtime, score gates)
- добавить отдельный коммит для SQL schema и seed данных
- после первого staging деплоя — зафиксировать release evidence документом/скриншотами

