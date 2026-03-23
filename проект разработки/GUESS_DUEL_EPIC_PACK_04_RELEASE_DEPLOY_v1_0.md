# GUESS_DUEL_EPIC_PACK_04_RELEASE_DEPLOY_v1_1

Objective (Release + hardening):

- довести продукт до деплоя и безопасной эксплуатации.

Deliverables:

1. README + env
   - `README.md`
   - `.env.example` (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)
2. Vercel deploy readiness
   - ensure build works without secrets (safe supabase client creation)
3. Production hardening
   - add RLS guest policies
   - verify server time logic for press timing (optional)
4. Verification
   - smoke tests and test strategy (see test pack)

Status:

- done:
  - build succeeds без env during CI/build;
  - RLS guest policies added to `supabase/schema.sql`;
  - stricter anti-cheat path enabled via server RPC `submit_guess_server`;
  - fan-centric schema extension added and applied;
  - production deployment active on `https://guess-duel.vercel.app`.
- open (non-blocking):
  - broaden automated e2e coverage for match-centric fan-flow.
