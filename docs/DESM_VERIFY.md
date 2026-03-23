# DESM — релизный прогон Guess Duel

**DESM** в этом репозитории — кодовое имя линейки (`desm-guess-game`). **DESM-прогон** — единый набор автоматических проверок перед релизом или после крупных изменений.

## Команда «всё сразу»

```bash
npm run verify:desm
```

Выполняет по цепочке:

1. `format:check` — Prettier
2. `lint` — ESLint (0 warnings)
3. `test:unit` — Vitest
4. `build` — Next.js production + TypeScript
5. `audit:deps` — npm audit (уровень high)
6. `test:e2e` — Playwright (Chromium; при необходимости поднимает dev-сервер)

## Опционально: нагрузочный smoke (k6)

Нужны установленный `k6` и **уже запущенный** сервер на порту 3000:

```bash
npm run build && npm run start -- -p 3000
# в другом терминале:
npm run verify:desm:load
# то же самое, что npm run test:load
```

Переменная `BASE_URL` переопределяет хост (по умолчанию `http://127.0.0.1:3000`).

## Соответствие CI

Локальный `verify:desm` покрывает и расширяет GitHub Actions (`.github/workflows/ci.yml`: quality + e2e). Нагрузочный тест в CI по умолчанию не запускается.

## История прогонов

Фиксируйте дату и результат в `GUESS_DUEL_TEST_STRATEGY_PACK_v1_0.md` (раздел executed QA), если нужна формальная трассировка.
