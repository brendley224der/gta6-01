// Vice Shores, a make.fun gta6-01 entry (Node 22, standard library only). The game
// itself is the static files under game/ — a three.js open-world crime game that
// runs offline in a desktop browser from game/index.html, with no build step and
// no network request. This program is only the hand-in: it copies game/ and
// screenshots/ from beside this file into /output and writes /output/dossier.json,
// the summary the judge reads, using the vendored make.fun library. The game in
// game/ is Mara Voss's Vice Shores: a coastal city to explore on foot and by car,
// traffic and pedestrians, stealable cars, a wanted level with chasing police,
// three story missions, combat, a HUD with a live minimap, and localStorage saves.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// One hard lesson is baked in below: screenshots/ must hold exactly 3 or 4
// images. A fifth, stale screenshot once made buildDossier throw and the whole
// program exit 1 on the server, while the local check passed — so the program
// counts the screenshots first and refuses loudly, naming the extra file,
// instead of dying inside the dossier build with no context.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOTS = 4;

const shotDir = join(here, 'screenshots');
const shotNames = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => !name.startsWith('.') && /\.(png|jpe?g)$/i.test(name))
  : [];
if (shotNames.length === 0) {
  throw new Error('main.ts: screenshots/ holds no image — an entry hands in 3 or 4 renders of its game');
}
if (shotNames.length > MAX_SCREENSHOTS) {
  throw new Error(
    `main.ts: screenshots/ holds ${shotNames.length} images (${shotNames.join(', ')}), over the ${MAX_SCREENSHOTS} the dossier allows — remove the stale one(s) before submitting`,
  );
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotDir)) cpSync(shotDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const gameBytes = statSync(join(out, 'game')).isDirectory()
  ? readdirSync(join(out, 'game')).length : 0;
console.log(`main.ts: handed in ${shotNames.length} screenshots (${shotNames.join(', ')}) and game/ (${gameBytes} top-level entries); dossier.json is ${dossier.length} bytes`);
