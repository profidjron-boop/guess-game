# Участие в разработке Guess Duel

## Требования

- Node.js LTS (как в окружении CI)
- npm

## Быстрый старт

```bash
npm install
cp .env.example .env.local
# Заполните NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## База данных

1. Создайте проект в Supabase.
2. Выполните **`supabase/schema.sql`** в SQL Editor (целиком или актуальные `CREATE OR REPLACE` для функций при обновлении).
3. Включите Realtime для таблиц игрового цикла — см. корневой **`README.md`**.

## Проверки перед PR / релизом

```bash
npm run verify:desm
```

Подробности: **`docs/DESM_VERIFY.md`**.

## Документация

Индекс: **`docs/GUESS_DUEL_DOCUMENT_INDEX_v1_0.md`**.  
Краткий обзор механики: **`docs/README.md`**.

## Лицензия

Проприетарная — см. **`LICENSE`**. Коммерческие вопросы: **djron11@mail.ru**.
