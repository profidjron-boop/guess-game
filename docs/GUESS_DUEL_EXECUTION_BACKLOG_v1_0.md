# GUESS_DUEL_EXECUTION_BACKLOG_v1_1

- Version: v1.1
- Date: 2026-03-23
- Project: Guess Duel

---

## 1) Epic backlog status

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
  - `submit_guess_server`
  - `mark_round_event`
  - `apply_round_results`
  - `finalize_game`

Status: done

### Epic 03 — Fan-centric UX and gameplay context

Deliverables:

- matches list + match page + team side selection
- room/game/results/final with match/event/team context
- realtime sync for rooms/participants/rounds
- host controls round start + **эталон на эфире** (`mark_round_event`) + server-side finalize chain

Status: done

### Epic 04 — Release & hardening

Deliverables:

- RLS policies for guest-mode
- strict server time validation
- test strategy + smoke runbook
- ensure build on vercel with env vars
- schema extension for match-centric model

Status: done

Done:

- RLS guest policies добавлены в `supabase/schema.sql`.
- Server-side submit path реализован через `submit_guess_server`.
- Build/readme/env readiness закрыты.
- Match-centric schema extension добавлена (`matches`, `match_event_templates`, room/participant/round fields).
- Production deployment активен: `https://guess-duel.vercel.app`.

Open:

- Расширить automated e2e/regression suite на fan-flow.

---

## 2) Dependency notes

- Supabase tables must exist before UI connects.
- Realtime must be enabled for the relevant tables.
- Client profile must be created in localStorage before room operations.
