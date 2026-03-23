# GUESS_DUEL_EPIC_PACK_04 — Release & deploy

**Version:** v1.2  
**Date:** 2026-03-24

**Objective:** релиз, окружение, минимальное hardening.

---

## Deliverables (закрыто)

1. **Документация и env** — `README.md`, `.env.example`, `docs/*`
2. **Vercel** — сборка с пустым Root Directory; переменные Supabase — см. **`docs/VERCEL_DEPLOY.md`**
3. **Безопасность данных** — RLS guest в **`supabase/schema.sql`**
4. **Проверки** — `npm run verify:desm`, `docs/DESM_VERIFY.md`, GitHub Actions
5. **Прод** — `https://guess-duel.vercel.app`

---

## Открыто (не блокер)

- Расширить e2e под полный fan-flow

---

## Примечания

- Ошибки RPC в UI обрабатываются через **`lib/formatError.ts`**.
- Дубликаты проектов в Vercel (два имени на один репозиторий) не влияют на код; рабочий проект с Git — основной для деплоя.
