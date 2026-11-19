// All sound is synthesized with WebAudio — no audio files, no network.
// Short effects (gunshot, punch, pickup, siren blip, crash, skid screech) plus
// a quiet sunset music loop: a lazy bassline and soft chords scheduled ahead.
// Nothing is created until a user gesture unlocks the context (start button).
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let beat = 0;
  let unlocked = false; // only create the context after a user gesture (start button)

  function ensure() {
    if (!unlocked) return false;
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, lowpass = 1200) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  // A tiny sunset groove in A minor: bass notes walk, a soft pad chord floats above.
  const BASS = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42];
  const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 220, 261.63]];

  function scheduleBar() {
    if (!ctx || muted) return;
    const chord = CHORDS[beat % CHORDS.length];
    for (const f of chord) tone(f, 1.9, 'sine', 0.05);
    tone(BASS[beat % BASS.length], 0.42, 'triangle', 0.22);
    tone(BASS[beat % BASS.length] * 2, 0.2, 'sine', 0.06);
    if (beat % 2 === 0) noise(0.05, 0.05, 6000);
    beat += 1;
  }

  return {
    /** Call from a user gesture (start button / first key) so the context may run. */
    unlock() {
      unlocked = true;
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (ctx && !musicTimer) {
        musicTimer = window.setInterval(() => { if (!muted) scheduleBar(); }, 480);
      }
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
    shoot() { noise(0.14, 0.5, 2600); tone(180, 0.1, 'square', 0.18, 0, 60); },
    punch() { noise(0.09, 0.35, 900); tone(120, 0.08, 'sine', 0.2, 0, 70); },
    crash() { noise(0.3, 0.5, 700); tone(90, 0.25, 'sine', 0.25, 0, 40); },
    skid() { noise(0.22, 0.16, 3200); },
    pickup() { tone(660, 0.12, 'sine', 0.25); tone(990, 0.2, 'sine', 0.25, 0.1); },
    missionDone() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.35, 'triangle', 0.22, i * 0.11));
    },
    wantedUp() { tone(440, 0.18, 'square', 0.14); tone(587, 0.18, 'square', 0.14, 0.16); },
    siren() { tone(750, 0.35, 'sine', 0.07, 0, 950); },
    engine(speed01) {
      if (!ensure() || muted) return;
      tone(50 + speed01 * 90, 0.12, 'sawtooth', 0.03);
    },
    click() { tone(880, 0.05, 'sine', 0.15); },
  };
}
