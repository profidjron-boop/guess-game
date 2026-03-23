# GUESS_DUEL_UI_SYSTEM_RULES_v1_0

Version: v1.0  
Date: 2026-03-23  
Project: Guess Duel

---

## 1) Theme / layout rules

- Dark theme по умолчанию (см. `app/globals.css` + tailwind colors)
- Mobile-first
- Крупные элементы управления, особенно `СЕЙЧАС!`
- Никаких пустых заглушек: если нет данных, показываем понятный текст (“Пока нет активных комнат...”)

---

## 2) Screen composition rules

1. Лобби

- профиль (nick + avatar)
- комнаты (list)
- create/join primary CTAs

2. Комната ожидания

- код + invite link
- список участников онлайн
- host badge
- ready toggle

3. Игровой экран

- таймер с анимацией/прогрессом
- событие title + category
- большая кнопка `СЕЙЧАС!` (disabled после press)
- realtime scoreboard в реальном времени

4. Результаты раунда (modal)

- event_time_ms
- список игроков с press_time_ms, delta_ms, points
- winner highlight

5. Итоговый экран

- top-3 анимация
- полная таблица результатов
- средняя/лучшая точность + серия

6. Глобальный leaderboard

- top-20
- фильтр по category

---

## 3) Motion / animation requirements

- Framer Motion:
  - переходы экранов и модалок (fade/scale/spring)
  - анимация таймера (progress)
  - анимация `СЕЙЧАС!` на первом/единственном press
  - анимация топ-3 на финале
