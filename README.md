# Vice Shores

A GTA 6-inspired 3D open-world crime game that runs entirely in the browser.
Explore a coastal city — downtown streets, a park district, a marina with
boats, and a beach — on foot or behind the wheel.

## How to play

- **WASD / arrows** — walk (hold Shift to run); drive when inside a car
- **E** — enter / exit a car. Stealing a parked car raises your wanted level;
  hailing a yellow taxi is free and legal
- **M** — start the next story mission

## Features

- On-foot movement with a third-person camera
- Driving: enter/exit cars, steering, acceleration, braking, speed in the HUD
- Wanted system: crimes raise stars, police cars pursue and ram, escaping and
  staying out of sight decays the wanted level
- Three story missions with objectives, progress, and rewards ($500 / $750 /
  $1,000): Package Run, Lose the Heat, VIP to the Marina
- Minimap with player arrow, mission marker, police dots, and taxi icons
- Taxis you can hail, pedestrians, and looping traffic for city life
- HUD: wanted stars, money, speed, mission objective, banners, start screen

## Tech

- three.js 0.160.0, vendored under `game/vendor/` (no network at runtime)
- Plain ES modules under `game/src/`; no build step, no paid APIs

## Run locally

```sh
node serve.ts   # serves game/ at http://localhost:8080/
```

## Build the entry output

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/brendley224der/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/brendley224der/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Vice Shores is an entry for the [Make GTA 6 bounty](https://make.fun/bounty/gta6-01) on make.fun.

Run it: `node serve.ts`, then open http://localhost:8080.
