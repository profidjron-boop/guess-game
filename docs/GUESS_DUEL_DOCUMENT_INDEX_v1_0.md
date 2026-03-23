# GUESS_DUEL_DOCUMENT_INDEX_v1_2

Version: v1.2  
Date: 2026-03-24  
Product: Guess Duel  
Purpose: master index of all governing documents for this project

All listed files live in the repository folder `docs/` (formerly a Cyrillic-named docs folder).

Release verification shortcut: `docs/DESM_VERIFY.md` + `npm run verify:desm`.

---

## 1) Strategic / governing

1. `GUESS_DUEL_PROJECT_STATE_v1_0.md` - project mode, constraints, stack, current slice
2. `GUESS_DUEL_READY_TZ_v1_0.md` - readiness / scope snapshot (fan-centric v1.1)
3. `GUESS_DUEL_BUILD_PLAN_v1_0.md` - executed phase plan (v1.1)

---

## 2) Planning / execution

4. `GUESS_DUEL_EXECUTION_BACKLOG_v1_0.md` - epic-level backlog and dependencies (v1.1)
5. `GUESS_DUEL_EPIC_PACK_01_FOUNDATION_v1_0.md`
6. `GUESS_DUEL_EPIC_PACK_02_MULTIPLAYER_REALTIME_v1_0.md`
7. `GUESS_DUEL_EPIC_PACK_03_UI_GAME_MECHANICS_v1_0.md`
8. `GUESS_DUEL_EPIC_PACK_04_RELEASE_DEPLOY_v1_0.md`

---

## 3) Architecture / data / contracts

9. `GUESS_DUEL_ADR_PACK_v1_0.md` - architecture decisions authority
10. `GUESS_DUEL_SCHEMA_DATA_MODEL_PACK_v1_0.md` - schema/data model authority (Supabase)
11. `GUESS_DUEL_API_CONTRACT_PACK_v1_0.md` - realtime/data contract (tables + RPC)

---

## 4) UI / quality

12. `GUESS_DUEL_UI_SYSTEM_RULES_v1_0.md` - UI/UX implementation rules
13. `GUESS_DUEL_TEST_STRATEGY_PACK_v1_0.md` - test strategy and release verification

---

## 5) Recommended reading order

1. Project State
2. Ready TZ
3. ADR Pack
4. Schema/Data model
5. API Contract
6. Build Plan
7. Execution Backlog
8. Relevant Epic Packs
9. UI System Rules
10. Test Strategy

---

## 6) Release evidence

- Production URL: `https://guess-duel.vercel.app`
- Last fan-flow implementation commits: `f17102b`, `29934a8`
- QA baseline executed locally (2026-03-24): format, lint, unit, e2e, build, audit, load

---

## 7) Legal / licensing

- Root `LICENSE` - proprietary license, all rights reserved; contact: `djron11@mail.ru`
- `NOTICE` - short copyright + licensing contact
- `package.json` -> `"license": "UNLICENSED"`, `author` with contact email
