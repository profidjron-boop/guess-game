# GUESS_DUEL_UI_SYSTEM_RULES_v1_0

Version: v1.1  
Date: 2026-03-24  
Project: Guess Duel

---

## 1) Theme / layout rules

- Dark theme по умолчанию (`app/globals.css` + tailwind)
- Mobile-first
- Крупная кнопка `СЕЙЧАС!`
- Понятные пустые состояния

---

## 2) Screen composition rules

1. Лобби / каталог матчей — см. маршруты `/`, `/match/[slug]`

2. Комната ожидания

- код + invite link
- участники, host badge, ready
- подсказка: после старта игроки ориентируются на **трансляцию**, не на внутренний таймер

3. Игровой экран (second-screen)

- **Главный акцент:** матч, лига, команда, целевое событие, статус «ждём событие на трансляции», большая кнопка `СЕЙЧАС!`
- **Хост:** отдельный блок — кнопка фиксации **эталона момента на эфире** (`mark_round_event`), пока `event_time_ms` у раунда `null`
- **Не главный ориентир:** компактная полоска «окно приёма нажатий между игроками» (технический лимит сессии, не часы матча)
- realtime scoreboard

4. Результаты раунда (modal)

- `event_time_ms`, press, delta, points; winner highlight

5. Итоговый экран — top-3, таблица, метрики

6. Глобальный leaderboard — top-20, фильтр category

---

## 3) Motion / animation requirements

- Framer Motion: модалки, лёгкая анимация кнопки, финал top-3
- Прогресс «окна раунда» — ненавязчивый (не конкурирует с смыслом эфира)
