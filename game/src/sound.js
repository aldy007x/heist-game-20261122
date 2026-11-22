// Tiny synthesized sounds: no audio files, everything is an oscillator
// through the Web Audio API, created on the first user gesture.
export function createSound() {
  let context = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, duration, type, volume, when = 0) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + when);
      oscillator.stop(ctx.currentTime + when + duration);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    /** Unlock the audio context from a user gesture. */
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    pickup() {
      tone(880, 0.12, 'sine', 0.12);
      tone(1318, 0.18, 'sine', 0.1, 0.09);
    },
    spotted() {
      tone(220, 0.16, 'square', 0.07);
      tone(220, 0.16, 'square', 0.07, 0.2);
    },
    caught() {
      tone(392, 0.22, 'sawtooth', 0.09);
      tone(262, 0.3, 'sawtooth', 0.09, 0.2);
      tone(165, 0.5, 'sawtooth', 0.09, 0.42);
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.22, 'sine', 0.11, index * 0.12));
    },
  };
}
