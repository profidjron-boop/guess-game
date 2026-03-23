# GUESS_DUEL_PROJECT_STATE_v1_1

Project: Guess Duel  
Client: viewers (sports + esports broadcasts)  
Project type: browser multiplayer game (guest mode, no auth)

Stage: fan-mode implementation completed  
Status: release-ready  
Owner: greka  
Date: 2026-03-23  
Updated: 2026-03-24

---

## 1) Product discovery

Goal: дать зрителям соревноваться в точности угадывания момента события по конкретному матчу и выбранной команде (second-screen companion experience).

Primary user actions:

- выбор матча из каталога и фильтров
- выбор команды, за которую болеет пользователь
- выбор события (goal/first blood/ace и др. в контексте команды)
- создание/вход в комнату по матчу
- игра в realtime с контекстом матча на экране
- просмотр результатов и итогов по конкретному матчу

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

Выполнено:

1. Fan-centric UX flow: `matches list -> match page -> team side selection -> room -> gameplay`.
2. Матчевый контекст внедрен в room/game/results/final экраны.
3. Расширена Supabase schema под match-centric модель (`matches`, `match_event_templates`, room/participant/round context fields).
4. Realtime, scoring, server-side anti-cheat и round finalize сохранены без регрессий.
5. Production URL развернут: `https://guess-duel.vercel.app`.

---

## 4) Constraints / non-negotiables

- Темный стиль с повышенным контрастом (читабельность first-screen и игровых экранов)
- Mobile-first интерфейс, крупная кнопка `СЕЙЧАС!`
- Stage-chain: matches -> match -> room wait -> playing -> round results -> finished -> leaderboard
- Истина по очкам и winner раунда: вычисление и фиксация на сервере (RPC/DB function)
- Rounds: 5 раундов, одно нажатие за раунд

---

## 5) Blocking open questions

Критичных блокеров нет. Рабочие follow-ups:

1. Расширить e2e покрытия на матчевый пользовательский сценарий.
2. Добавить интеграцию с live-stream iframe и внешними match API (future scope).

---

## 6) Release evidence

- Production: `https://guess-duel.vercel.app`
- Code baseline: `main` branch, commits `f17102b`, `29934a8`.
- Supabase schema: applied (user-confirmed) from `supabase/schema.sql`.
