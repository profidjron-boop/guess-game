# GUESS_DUEL_READY_TZ_v1_1

Version: v1.1  
Date: 2026-03-23  
Project: Guess Duel

---

## 1) Ready scope (in)

- Next.js 16 App Router + TS + Tailwind
- Supabase Postgres (rooms/participants/rounds/guesses/leaderboard + match-centric extensions) + Realtime sync
- Механика игры: 5 раундов, кнопка `СЕЙЧАС!` одна нажатие за раунд, победитель раунда по min abs delta, серия/множители (server-authoritative)
- Screens:
  - Каталог матчей (фильтры, статусы, карточки матчей, onboarding)
  - Страница матча (выбор команды и события, запуск комнаты по матчу)
  - Лобби (legacy route `/lobby` сохранен)
  - Комната ожидания (код, invite link, онлайн участники, host badge, ready toggle, host start)
  - Игровой экран (match/league/team/event context + компактное окно приёма нажатий + кнопка `СЕЙЧАС!` + у хоста — фиксация эталона момента на эфире через `mark_round_event` + realtime таблица)
  - Экран результатов раунда (привязан к матчу/событию/команде)
  - Итоговый экран (match-centric summary + история раундов + share card)
  - Глобальный leaderboard (top-20, фильтр спорт/киберспорт/все)

---

## 2) Ready evidence pointers (what to verify before release)

1. Match flow:
   - `/` открывает каталог матчей, фильтры и поиск работают
   - `/match/[slug]` показывает матч, выбор стороны и событие
2. Room/game context:
   - в комнате и игре видны Match/League/Event/Selected team
   - в списке участников отображается выбранная команда
3. Core mechanics:
   - host стартует игру только в status `waiting`
   - в каждом раунде кнопка блокируется после первого нажатия; до фиксации эталона `delta_ms` у guess = `null`
   - хост фиксирует момент события на трансляции (`mark_round_event`) → пересчёт дельт, `apply_round_results`, следующий раунд или финал
   - после каждого завершённого раунда показывается modal с расчётами
4. Scoring/winner:
   - base points + penalty + streak multipliers соответствуют формуле
   - победитель по минимальному |delta_ms| среди guess с **не-null** `delta_ms`

---

## 3) Pending / follow-ups (deferred)

1. Расширить automated e2e/regression тесты на fan-flow (`matches -> match -> room -> rounds`).
2. Добавить live-stream iframe и live match API интеграцию (future scope).

## 4) Closed in v1.0 / v1.1 mechanics

- Strict серверная валидация клика реализована через `submit_guess_server` (press на сервере; `delta_ms` после эталона).
- Эталон момента на эфире — через RPC `mark_round_event` (только хост); продвижение раундов **не** через клиентский `sleep(duration)`.
- RLS policies для guest-mode добавлены в `supabase/schema.sql`.
- Match-centric schema extension применена в `supabase/schema.sql`.
