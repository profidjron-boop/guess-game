# GUESS_DUEL_EPIC_PACK_04_RELEASE_DEPLOY_v1_0

Objective (Release + hardening):
- довести продукт до деплоя и безопасной эксплуатации.

Deliverables:
1) README + env
   - `README.md`
   - `.env.example` (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)
2) Vercel deploy readiness
   - ensure build works without secrets (safe supabase client creation)
3) Production hardening
   - add RLS guest policies
   - verify server time logic for press timing (optional)
4) Verification
   - smoke tests and test strategy (see test pack)

Status:
- core done:
  - build succeeds без env during CI/build;
  - RLS guest policies added to `supabase/schema.sql`;
  - stricter anti-cheat path enabled via server RPC `submit_guess_server`.
- open:
  - automated test coverage;
  - deployment evidence (staging/prod URL + smoke-check log);
  - verify schema applied in target Supabase project.

