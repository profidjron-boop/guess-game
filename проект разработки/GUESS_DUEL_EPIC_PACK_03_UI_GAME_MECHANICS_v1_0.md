# GUESS_DUEL_EPIC_PACK_03_UI_GAME_MECHANICS_v1_0

Objective (UI + game mechanics):
- реализовать обязательные экраны и реальную механику раундов.

Deliverables:
1) Lobby
   - ник + аватар
   - create/join room
   - localStorage профиля
2) Waiting room
   - code + invite link
   - online participants list
   - host badge
   - ready state
   - only host can start
3) Gameplay
   - countdown timer + progress bar
   - событие title + категория
   - big button `СЕЙЧАС!` (lock after press)
   - realtime scoreboard
4) Round results modal
   - event time, press time, delta ms, points
   - highlight winner
5) Final screen
   - animated top-3
   - full table + accuracy stats + streak

Status:
- implemented in `components/` + routes under `app/`.

Notes:
- delta/press_time считаются на клиенте (в прод-режиме можно усилить серверным вычислением).

