// Vice Shores — keyboard input. One shared state object; the game loop
// reads it every frame, and the test harness can drive it with real keys.

export const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  run: false,
  interact: false, // E — edge-triggered, consumed by the game loop
  mission: false, // M — edge-triggered
};

let interactPressed = false;
let missionPressed = false;

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (name) {
      keys[name] = true;
      e.preventDefault();
    }
    if (e.code === 'KeyE' && !e.repeat) {
      keys.interact = true;
      interactPressed = true;
    }
    if (e.code === 'KeyM' && !e.repeat) {
      keys.mission = true;
      missionPressed = true;
    }
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) keys[name] = false;
    if (e.code === 'KeyE') keys.interact = false;
    if (e.code === 'KeyM') keys.mission = false;
  });
  window.addEventListener('blur', () => {
    keys.up = keys.down = keys.left = keys.right = keys.run = false;
  });
}

// Edge-triggered actions: the game loop calls these once per frame and
// they clear themselves, so one key press fires exactly one action.
export function consumeInteract() {
  const v = interactPressed;
  interactPressed = false;
  return v;
}

export function consumeMissionKey() {
  const v = missionPressed;
  missionPressed = false;
  return v;
}

// Test/debug helper: press a key programmatically.
export function pressKey(code, down) {
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  if (code === 'KeyE' && down) interactPressed = true;
  if (code === 'KeyM' && down) missionPressed = true;
}
