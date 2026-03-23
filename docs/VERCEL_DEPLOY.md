# Деплой на Vercel

## Переменные окружения

В проекте Vercel → **Settings → Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(Production / Preview по необходимости.)

## Root Directory (важно)

Репозиторий `guess-game` — это **уже корень приложения** Next.js (папки `app/`, `package.json` в корне).

В **Project → Settings → General → Root Directory** должно быть **пусто** (или `.`).

Если там указано `desm-guess-game` или вложенный путь, Vercel ищет несуществующую вложенность (`.../desm-guess-game/desm-guess-game`) и деплой падает с ошибкой _The provided path does not exist_.

Исправление: очистите Root Directory и сохраните, затем задеплойте снова.

## Способы деплоя

1. **Автоматически от Git:** push в подключённую ветку `main` — новый деплой (если интеграция GitHub включена).
2. **Dashboard:** Deployments → **Redeploy** последнего успешного или новый деплой с ветки `main`.
3. **CLI** (после `npx vercel login` и исправления Root Directory):

   ```bash
   npx vercel deploy --prod --yes
   ```

## Ссылка на настройки проекта

`https://vercel.com/profidjron-boops-projects/guess-duel/settings`

## Дубликаты проектов в Vercel

Если в аккаунте есть второй проект с другим именем и без Git — это не отдельное приложение в коде. Рабочий деплой с **подключённым репозиторием** и переменными окружения — основной; лишний проект можно отключить или удалить, чтобы не путаться.
