# GUESS_DUEL_EPIC_PACK_03_UI_GAME_MECHANICS_v1_1

Objective (UI + game mechanics):

- реализовать fan-centric second-screen UX и реальную механику раундов.

Deliverables:

1. Match entry flow
   - список матчей с фильтрами/поиском
   - страница матча
   - выбор команды и события
   - create/join room по матчу
2. Waiting room
   - code + invite link + match/event context
   - online participants list
   - host badge
   - ready state
   - only host can start
   - selected team у каждого участника
3. Gameplay
   - компактное окно/прогресс приёма нажатий (технический лимит сессии; не «часы матча»)
   - событие title + категория + match + league + selected team
   - big button `СЕЙЧАС!` (lock after press; до эталона `delta_ms` null)
   - у хоста: кнопка фиксации эталона на эфире → RPC `mark_round_event`
   - realtime scoreboard
4. Round results modal
   - event time, press time, delta ms, points + match/event context
   - highlight winner
5. Final screen
   - animated top-3 + match summary
   - full table + accuracy stats + streak + round history

Status:

- implemented in `components/` + routes under `app/`.

Notes:

- `press_time_ms` и итоговый `delta_ms` — серверно: `submit_guess_server` + цепочка после `mark_round_event`.
