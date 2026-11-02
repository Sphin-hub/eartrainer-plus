/**
 * audioEngine.ts — makes sound with the Web Audio API.
 *
 * Web Audio is a graph: sources -> gain nodes -> ... -> speakers.
 *   note = 5 sine "partials" -> per-partial decay -> envelope -> session -> master -> limiter -> out
 *
 * Three rules this file follows:
 *  1. The AudioContext is created inside a user click (browsers block autoplay).
 *  2. Timing uses the AUDIO clock (ctx.currentTime), never setTimeout — it's sample-accurate.
 *  3. Gains never jump: we ramp, because an instant jump is an audible click.
 */
import { midiToFrequency } from '../theory/notes';
import { NoteEvent, totalDuration } from './events';

/** [harmonic number, relative loudness, decay time-constant in seconds]. Higher partials fade faster, like a struck string. */
const PARTIALS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 1.0, 1.4],
  [2, 0.5, 0.9],
  [3, 0.25, 0.6],
  [4, 0.12, 0.4],
  [5, 0.06, 0.3],
];
const PARTIAL_SUM = PARTIALS.reduce((sum, p) => sum + p[1], 0);
const ATTACK = 0.01; // seconds
const RELEASE = 0.25; // seconds

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private session: GainNode | null = null;
  private volume = 0.7;

  /** Create/resume the audio context. Call from a click or tap. */
  async unlock(): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      const limiter = this.ctx.createDynamicsCompressor(); // safety net against clipping
      this.master.connect(limiter).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }

  /** Schedule events, replacing anything already playing. Resolves to the sequence length in seconds. */
  async play(events: NoteEvent[]): Promise<number> {
    const ctx = await this.unlock();
    this.stop();
    const session = ctx.createGain(); // one gain per play() so stop() can fade everything at once
    session.connect(this.master as GainNode);
    this.session = session;

    const startAt = ctx.currentTime + 0.05; // tiny lead-in so the first note isn't clipped
    // Notes sounding together add up; scale each note down so chords don't clip.
    const overlap = (e: NoteEvent) => events.filter((o) => o.start < e.start + e.duration && e.start < o.start + o.duration).length;
    const norm = 1 / Math.sqrt(Math.max(1, ...events.map(overlap)));
    for (const e of events) this.voice(ctx, session, e, startAt, norm);
    return totalDuration(events);
  }

  /** Fade out and silence whatever is playing. */
  stop(): void {
    if (!this.ctx || !this.session) return;
    const session = this.session;
    this.session = null;
    const now = this.ctx.currentTime;
    session.gain.setValueAtTime(session.gain.value, now);
    session.gain.linearRampToValueAtTime(0, now + 0.03);
    setTimeout(() => session.disconnect(), 100);
  }

  private voice(ctx: AudioContext, out: AudioNode, e: NoteEvent, startAt: number, norm: number): void {
    const t = startAt + e.start;
    const end = t + Math.max(e.duration, 0.1);
    const freq = midiToFrequency(e.midi);
    const peak = 0.3 * e.velocity * norm;

    // Envelope: quick attack, hold, then exponential release (exponential ramps can't touch 0, so use 0.0001).
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(peak, t + ATTACK);
    env.gain.setValueAtTime(peak, end);
    env.gain.exponentialRampToValueAtTime(0.0001, end + RELEASE);
    env.connect(out);

    for (const [k, amp, tau] of PARTIALS) {
      if (freq * k > ctx.sampleRate / 2) break; // above Nyquist would alias
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * k;
      const decay = ctx.createGain();
      decay.gain.setValueAtTime(amp / PARTIAL_SUM, t);
      decay.gain.setTargetAtTime(0, t + ATTACK, tau);
      osc.connect(decay).connect(env);
      osc.start(t);
      osc.stop(end + RELEASE + 0.05);
      osc.onended = () => {
        osc.disconnect();
        decay.disconnect();
        if (k === 1) env.disconnect(); // free the graph once the voice is done
      };
    }
  }
}

/** One shared engine for the whole app. */
export const engine = new AudioEngine();
