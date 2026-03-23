# GUESS_DUEL_EXECUTION_BACKLOG_v1_0

- Version: v1.0
- Date: 2026-03-23
- Project: Guess Duel

---

## 1) Epic backlog (what to finish next)

### Epic 01 — Foundation
Deliverables:
- UI baseline, TS types, supabase client wrapper
- scoring utilities in `lib/game/*`

Status: done (core implemented)

### Epic 02 — Database + seed
Deliverables:
- SQL schema + indexes + seed `round_templates`
- DB functions:
  - `compute_base_points`
  - `apply_round_results`
  - `finalize_game`

Status: done

### Epic 03 — Multiplayer realtime gameplay
Deliverables:
- lobby, room waiting, in-game screen, round results, final screen
- realtime sync for rooms/participants/rounds
- host controls round start + server-side finalize

Status: done (prototype-like UX polish may remain)

### Epic 04 — Release & hardening
Deliverables:
- RLS policies for guest-mode
- strict server time validation (optional but recommended)
- test strategy + smoke runbook
- ensure build on vercel with env vars

Status: in progress (core hardening done; release ops pending)

Done:
- RLS guest policies добавлены в `supabase/schema.sql`.
- Server-side submit path реализован через `submit_guess_server`.
- Build/readme/env readiness закрыты.

Open:
- Применить schema в целевом Supabase окружении (если ещё не сделано).
- Зафиксировать deployment evidence (URL + smoke-check).
- Добавить automated e2e/regression suite.

---

## 2) Dependency notes
- Supabase tables must exist before UI connects.
- Realtime must be enabled for the relevant tables.
- Client profile must be created in localStorage before room operations.

