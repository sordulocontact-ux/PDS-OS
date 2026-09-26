// Short two-note chime played with the in-app toast. Synthesised (no audio
// file). Browsers only allow sound once the page has had a click or a key
// press; before that, it stays silent without error.

let context: AudioContext | null = null;

export function playChime(): void {
  try {
    context ??= new AudioContext();
    const ctx = context;
    void ctx.resume();
    const start = ctx.currentTime;
    [880, 1318.5].forEach((frequency, index) => {
      const at = start + index * 0.12;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      // Quick attack, soft decay: audible without being harsh.
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.15, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.4);
    });
  } catch {
    // No audio available: the toast and the badge still show.
  }
}
