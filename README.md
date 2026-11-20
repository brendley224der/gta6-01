# Vice Shores

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/brendley224der/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/brendley224der/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Vice Shores is an entry for the [Make GTA 6 bounty](https://make.fun/bounty/gta6-01) on make.fun.

Vice Shores is a 3D open-world crime game inspired by GTA 6 that runs entirely in the browser. You wake up in a coastal city and make your own trouble: downtown towers, a leafy park district, a marina full of boats, and a long sandy beach are all yours to roam, on foot or behind the wheel.

## How to play

- **Move:** WASD or arrow keys to walk, hold **Shift** to run.
- **Cars:** press **E** to get in and out of a car. A parked car is free to take — but stealing one raises your wanted level.
- **Taxis:** yellow cabs are free and legal. Hop in one when you want to travel without the cops on your tail.
- **Missions:** press **M** to start the next story mission. Three are waiting: **Package Run** ($500), **Lose the Heat** ($750), and **VIP to the Marina** ($1,000).
- **Wanted system:** the more heat you cause, the more police chase you. Lay low and the wanted level decays on its own.
- **Minimap:** the corner map shows your arrow, the mission marker, police positions, and taxi icons, so you always know where the trouble is.
- **The city is alive:** pedestrians stroll the sidewalks and traffic cruises the streets while you play.

## HUD

The screen keeps everything in view: wanted stars, cash, speed, the current mission objective, banner announcements, and a start screen that sets the scene before you play.

## Tech

- Built on three.js 0.160.0, vendored locally in `game/vendor/` — the game makes no network requests at runtime.
- Plain ES modules in `game/src/`, no build step, no paid APIs.

Run it: `node serve.ts`, then open http://localhost:8080.
