# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/brendley224der/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/brendley224der/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Vice Shores** — a sun-soaked open-world crime game in the browser, built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

You are Mara Voss, a courier fresh off the ferry who owes the Shore Syndicate. Explore a modern coastal city — downtown towers, a central park, a beach boardwalk, the docks and the marina — on foot and by car. Steal parked cars (and the odd yellow cab), outrun Shore PD when your wanted stars climb, and run three story missions to pay the debt: a marina delivery, tailing a rival courier, and a hot pickup at the docks under police heat. Finishing the story opens repeatable courier runs — deliveries and hot pickups, alternating. Everything is original: our own city, characters, vehicles, story, art and synthesized sound — no Rockstar names, maps or assets.

What is in the game:

- A 3D coastal city (three.js, vendored locally) with a road grid, towers, a central park, beach, ocean, marina pier and boats, sunset lighting, palms and street lamps
- On foot (WASD + mouse camera) and by car (arcade driving, skid smoke and screech, crash shake, speed-stretching camera) — enter and exit any parked car with E
- Traffic cars cruising the roads (including yellow cabs) and pedestrians strolling the sidewalks and the sand — strollers, brisk walkers and joggers — who flee from gunfire and speeding cars
- A wanted system (1–5 stars) with black-and-white police cars that chase, ram and bust you, light bars flashing
- Three story missions with a gold beacon, HUD objectives, a mission progress counter and cash rewards, plus repeatable courier runs
- Combat on foot: punch (F) and a hitscan pistol (click) with tracers and a muzzle flash
- HUD with health, cash, wanted stars, mission objective and progress, speed and a live minimap
- Start screen, pause, WASTED / BUSTED game-over screens, and saves (money, mission progress, best cash) in localStorage
- Synthesized WebAudio sound effects and a sunset music loop (M to mute), particles and screen shake

## Controls

| Key / Mouse | Action |
|---|---|
| W A S D / arrows | Move on foot, drive / steer in a car (Shift to run) |
| Mouse drag | Orbit camera |
| E | Enter / exit the nearest car |
| F | Punch |
| Click | Shoot (on foot) |
| Enter | Start the next mission / courier run |
| P / Esc | Pause |
| M | Mute sound |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The game is plain static files under `game/` — no build step, no network requests, works offline.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game in a browser (title, driving with a mission running, a three-star police chase, and game over), staged with `?shot=start|play|chase|end&seed=1` as listed in `shots.json`. Exactly four — the dossier allows at most four, and a fifth stale shot once crashed the server build.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
