// Keyboard and mouse input. Held keys give movement; one-shot presses (enter car,
// punch, pause, mute, confirm) are queued as bit flags and taken once by the loop,
// so a press between two frames is never lost and never counted twice. The camera
// orbits by dragging the mouse; clicking also fires the player's weapon on foot.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;
export const ACTION_SHOOT = 32;

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createInput(target) {
  const keys = new Set();
  let actions = 0;
  let dragX = 0;
  let dragY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (event) => {
    if (MOVE_KEYS.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
    } else if (event.code === 'Space' || event.code === 'Enter') {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyE') {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (event.code === 'KeyF') {
      if (!event.repeat) actions |= ACTION_PUNCH;
    } else if (event.code === 'KeyM') {
      if (!event.repeat) actions |= ACTION_MUTE;
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  target.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    try { target.setPointerCapture(event.pointerId); } catch { /* touch fallback */ }
  });
  target.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragX += event.clientX - lastX;
    dragY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  target.addEventListener('pointerup', () => {
    dragging = false;
    // A short click (not a drag) fires the weapon when on foot.
    if (Math.abs(dragX) < 6 && Math.abs(dragY) < 6) actions |= ACTION_SHOOT;
    dragX = 0;
    dragY = 0;
  });

  function axis(neg, pos) {
    return (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
  }

  return {
    /** Forward/back (-1..1) and strafe (-1..1) from WASD / arrows. */
    move() {
      return {
        forward: axis('KeyS', 'KeyW') + axis('ArrowDown', 'ArrowUp'),
        strafe: axis('KeyA', 'KeyD') + axis('ArrowLeft', 'ArrowRight'),
        run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      };
    },
    /** Camera orbit deltas accumulated since the last call, in pixels. */
    takeDrag() {
      const out = { x: dragX, y: dragY };
      dragX = 0;
      dragY = 0;
      return out;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    isDown(code) {
      return keys.has(code);
    },
  };
}
