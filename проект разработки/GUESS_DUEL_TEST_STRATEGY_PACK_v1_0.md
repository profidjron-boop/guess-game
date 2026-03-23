# GUESS_DUEL_TEST_STRATEGY_PACK_v1_1

Version: v1.1  
Date: 2026-03-24  
Project: Guess Duel

---

## 1) What to test (must-have)

1. Очки и серии (согласованность)

- base points: окна delta (0-500, 501-1000, 1001-2000, 2001-5000, >5000)
- ранний клик: delta_ms < 0 => -100
- streak/multiplier:
  - 2 точных подряд => x1.5
  - 3+ точных подряд => x2

2. Winner раунда

- минимальный |delta_ms| среди игроков

3. Сценарий 5 раундов

- хост стартует только при status `waiting`
- кнопка блокируется после press
- после round end показывается modal и запускается следующий раунд

4. Realtime sync

- состояние комнаты видно в 2-3 вкладках (rooms/participants/rounds)

5. Leaderboard

- после финала происходит запись в `leaderboard`
- UI показывает топ-20 и фильтр по category

---

## 2) Suggested test pyramid

1. Unit

- тесты TS для scoring utilities (`lib/game/scoring.ts`) и времени

2. Integration

- SQL smoke: вызвать `apply_round_results` и проверить обновления participants.score/streak

3. E2E

- Playwright: 2 гостя в разных вкладках
- симуляция press timing (в пределах допуска) и проверка winner/score

---

## 3) Release verification checklist (smoke)

1. `npm run build` проходит при наличии env в CI/локально
2. Realtime:
   - создать комнату, подключить 2 игрока, убедиться в synchronized списке
3. Gameplay:
   - хост стартует игру
   - раунды идут без зависаний
4. Finishing:
   - финальный screen показывает топ-3 и таблицу
5. Leaderboard:
   - top-20 обновляется после игры

---

## 4) Executed QA baseline (verified)

Обязательный минимум из продуктового чек-листа закрыт:

1. Linter + formatter:

- `npm run format:check` -> passed
- `npm run lint` -> passed

2. Unit/integration:

- `npm run test:unit` -> passed (Vitest, 3 files / 9 tests)

3. E2E smoke:

- `npm run test:e2e` -> passed (актуализирован под экран "Матчи")

4. Build/type safety:

- `npm run build` -> passed

5. Dependency security:

- `npm run audit:deps` -> passed (0 vulnerabilities)

6. Basic load:

- `npm run test:load` -> passed (k6, 10 VU / 30s)
- thresholds:
  - `http_req_failed < 1%` -> passed (`0.00%`)
  - `http_req_duration p(95) < 600ms` -> passed (`9.71ms`)
