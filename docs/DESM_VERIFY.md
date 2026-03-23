# DESM — единый прогон проверок (Guess Duel)

**DESM** здесь — условное имя линейки репозитория; **команда ниже** — стандартный набор проверок перед релизом или после крупных изменений.

## Команда

```bash
npm run verify:desm
```

По порядку:

1. `format:check` — Prettier
2. `lint` — ESLint (0 warnings)
3. `test:unit` — Vitest
4. `build` — Next.js production + TypeScript
5. `audit:deps` — `npm audit --audit-level=high`
6. `test:e2e` — Playwright

## Нагрузка (опционально)

Нужны `k6` и сервер на порту 3000:

```bash
npm run build && npm run start -- -p 3000
# другой терминал:
npm run verify:desm:load
```

Переменная **`BASE_URL`** переопределяет хост (по умолчанию `http://127.0.0.1:3000`).

## CI

Локальный прогон соответствует духу **`.github/workflows/ci.yml`** (quality + e2e). k6 в CI по умолчанию не запускается.

## Документация

Индекс проектных документов: **`docs/GUESS_DUEL_DOCUMENT_INDEX_v1_0.md`**.
