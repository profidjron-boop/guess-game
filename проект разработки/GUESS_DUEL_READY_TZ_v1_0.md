# GUESS_DUEL_READY_TZ_v1_0

Version: v1.0  
Date: 2026-03-23  
Project: Guess Duel

---

## 1) Ready scope (in)
- Next.js 14 App Router + TS + Tailwind
- Supabase Postgres (rooms/participants/rounds/guesses/leaderboard) + Realtime sync
- Механика игры: 5 раундов, кнопка `СЕЙЧАС!` одна нажатие за раунд, победитель раунда по min abs delta, серия/множители
- Screens:
  - Лобби (ник + аватар, rooms list, create/join, localStorage профиля)
  - Комната ожидания (код, invite link, онлайн участники, host badge, ready toggle, host start)
  - Игровой экран (таймер + анимация, событие, крупная кнопка, realtime таблица игроков)
  - Экран результатов раунда (event time, press time, delta, points, winner highlight, плавный переход)
  - Итоговый экран (top-3 анимация, полная таблица, точность, серия, кнопки “Новая игра”/“В лобби”)
  - Глобальный leaderboard (top-20, фильтр спорт/киберспорт/все)

---

## 2) Ready evidence pointers (what to verify before release)
1) Realtime:
   - изменения rooms/participants/rounds видны во всех вкладках
2) Round flow:
   - host стартует игру только в status `waiting`
   - в каждом раунде кнопка блокируется после первого нажатия у конкретного игрока
   - после каждого раунда показывается modal с расчётами
3) Scoring:
   - base points по таблице delta windows соблюдены
   - штраф за ранний клик: delta_ms < 0 => -100
   - streak/multiplier: 2 подряд => x1.5, 3+ => x2
4) Winner:
   - победитель по минимальному |delta_ms|

---

## 3) Pending / follow-ups (deferred)
1) Добавить automated e2e/regression тесты для ключевых сценариев (см. `GUESS_DUEL_TEST_STRATEGY_PACK_v1_0.md`).
2) Завершить release evidence: staging/prod URL + smoke-check артефакты после деплоя.
3) Применить `supabase/schema.sql` в целевом Supabase окружении (если ещё не применено).

## 4) Closed in v1.0
- Strict серверная валидация клика реализована через `submit_guess_server` (press/delta считаются на стороне БД).
- RLS policies для guest-mode добавлены в `supabase/schema.sql`.

