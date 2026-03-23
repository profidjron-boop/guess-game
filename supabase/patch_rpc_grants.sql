-- Run once in Supabase SQL Editor if guesses fail with "permission denied" from submit_guess_server.
-- (Full schema.sql already includes these grants at the end.)

grant execute on function public.compute_base_points(integer) to anon, authenticated;
grant execute on function public.apply_round_results(uuid, uuid) to anon, authenticated;
grant execute on function public.finalize_game(uuid) to anon, authenticated;
grant execute on function public.submit_guess_server(uuid, uuid, uuid) to anon, authenticated;
