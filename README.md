# Guess Duel

Полностью рабочая многопользовательская браузерная игра для зрителей спортивных и киберспортивных трансляций.

Игроки в реальном времени нажимают `СЕЙЧАС!` в момент наступления события и соревнуются по точности.
Серия раундов, очки, серии и таблицы синхронизируются через Supabase Realtime.

## Возможности

- Лобби: ник, аватар, список комнат, создание и вход
- Комната ожидания: код комнаты, ссылка-приглашение, онлайн-участники, готовность, хост-старт
- Игровой экран: живой таймер, событие раунда, кнопка `СЕЙЧАС!`, блок после одного нажатия
- Результаты раунда: событие, время клика, delta, очки, победитель раунда
- Итоги игры: топ-3 с анимацией, полная таблица, метрики точности и серии
- Глобальный лидерборд: топ-20 + фильтр `спорт / киберспорт / все`

## Стек

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Postgres + Realtime)
- Framer Motion
- Деплой: Vercel

## Структура проекта

```text
app/
  leaderboard/
  room/[code]/
components/
hooks/
lib/
  game/
  supabase/
supabase/
types/
проект разработки/
```

## Supabase setup

1) Создайте Supabase project.
2) Включите Realtime для таблиц:
   - `rooms`
   - `participants`
   - `rounds`
   - `guesses`
   - `leaderboard`
3) Импортируйте SQL schema:
   - `supabase/schema.sql`

Примечание: в этом проекте guest-игроки не используют Supabase Auth.
RLS/policies уже включены в `supabase/schema.sql` (guest-friendly режим для anon/authenticated ролей).

## Env

Скопируйте `.env.example` в `.env.local` и заполните:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте `http://localhost:3000`.

## Как проверить игру (быстрый smoke-test)

1. Откройте сайт в двух вкладках (или двух браузерах).
2. Вкладка A: создайте комнату.
3. Вкладка B: зайдите в эту комнату по коду/ссылке.
4. Хост во вкладке A запускает игру.
5. В каждом раунде оба игрока нажимают `СЕЙЧАС!`.
6. Проверьте:
   - синхронизацию таблицы очков в обеих вкладках;
   - модалку результатов раунда;
   - финальный экран;
   - появление записей в глобальном leaderboard.

## Деплой на Vercel

1) Подключите репозиторий к Vercel.
2) В Vercel Dashboard -> Project Settings -> Environment Variables добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3) Деплой.

## Schema & функции

Файл `supabase/schema.sql` содержит:

- таблицы: `rooms`, `participants`, `round_templates`, `rounds`, `guesses`, `leaderboard`
- функции:
  - `compute_base_points(delta_ms)`
  - `submit_guess_server(room_id, round_id, player_id)` (серверно вычисляет `press_time_ms` и `delta_ms`)
  - `apply_round_results(room_id, round_id)` (очки, streak/серии, winner раунда)
  - `finalize_game(room_id)` (запись результатов в `leaderboard`)

## Игровая математика

- Базовые очки:
  - `0-500 ms` -> `1000`
  - `501-1000 ms` -> `750`
  - `1001-2000 ms` -> `500`
  - `2001-5000 ms` -> `250`
  - `>5000 ms` -> `0`
- Раннее нажатие (`delta_ms < 0`) -> штраф `-100`
- Серия:
  - 2 точных подряд (`|delta| <= 1000`) -> `x1.5`
  - 3+ точных подряд -> `x2`

## Данные раундов

`round_templates` содержит 5 раундов (Гол/Удар в голову/Килл/Нокаут/Пойнт/Фраг).

## Документация по разработке

Полный пакет документов и плана находится в:
- `проект разработки/`

Главный индекс:
- `проект разработки/GUESS_DUEL_DOCUMENT_INDEX_v1_0.md`

## GitHub (подготовка)

Если remote уже задан:

```bash
git remote -v
```

Если нужно добавить remote:

```bash
git remote add origin https://github.com/profidjron-boop/guess-game.git
```

Публикация (после commit):

```bash
git push -u origin main
```

