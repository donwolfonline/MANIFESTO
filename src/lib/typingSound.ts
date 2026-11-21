/**
 * Lightweight Web Audio synthesizer for subtle mechanical key clicks.
 * Instantiates AudioContext lazily only when the user explicitly toggles sound on.
 */
class TypingSoundEngine {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playKey(variant: 'key' | 'enter' | 'backspace' = 'key') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.value =
      variant === 'enter' ? 640 : variant === 'backspace' ? 420 : 880;
    filter.Q.value = 1.4;

    osc.type = 'triangle';
    const baseFreq =
      variant === 'enter'
        ? 170
        : variant === 'backspace'
          ? 135
          : 210 + Math.random() * 45;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.022);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(
      variant === 'enter' ? 0.055 : 0.038,
      now + 0.003,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }
}

export const typingSound = new TypingSoundEngine();
