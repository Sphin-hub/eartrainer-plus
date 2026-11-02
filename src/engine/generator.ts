/** generator.ts — seeded question generation + answer checking for the Functional Note Trainer. */
import { NoteName, parseNote, toMidi } from '../theory/notes';
import { SCALES, ScaleId, keysFor } from '../theory/scales';

/** Small seeded random generator (mulberry32): same seed = same questions, so tests are reproducible. */
export function makeRng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Question {
  tonic: NoteName;
  scaleId: ScaleId;
  /** 0-based index into the scale (0 = tonic). */
  degreeIndex: number;
  tonicMidi: number;
  targetMidi: number;
}

/** weights[i] = how much more often degree i should come up (weak degrees get more). */
export function makeQuestion(scaleId: ScaleId, rng: () => number, weights: number[], prev?: Question, fixedKey?: string): Question {
  const pattern = SCALES[scaleId].semitonePattern;
  const keys = keysFor(scaleId);
  const picked = keys[Math.floor(rng() * keys.length)]!;
  const tonic = parseNote(fixedKey && fixedKey !== 'random' ? fixedKey : picked);
  const pool = pattern.map((_, i) => (prev && prev.degreeIndex === i && prev.scaleId === scaleId ? 0 : weights[i] ?? 1));
  let pick = rng() * pool.reduce((a, b) => a + b, 0);
  let degreeIndex = pool.findIndex((w) => (pick -= w) < 0);
  if (degreeIndex < 0) degreeIndex = 0;
  const tonicMidi = toMidi(tonic, 3);
  const targetMidi = tonicMidi + pattern[degreeIndex]! + (rng() < 0.5 ? 12 : 0);
  return { tonic, scaleId, degreeIndex, tonicMidi, targetMidi };
}

/** The answer is checked against the generated event itself, never against a label. */
export const isCorrect = (q: Question, answerIndex: number): boolean => q.degreeIndex === answerIndex;

/** Practice weights from history: low accuracy -> higher weight. */
export function weightsFor(scaleId: ScaleId, stats: Record<string, { right: number; total: number }>): number[] {
  return SCALES[scaleId].semitonePattern.map((_, i) => {
    const s = stats[`${scaleId}:${i}`];
    const accuracy = ((s?.right ?? 0) + 1) / ((s?.total ?? 0) + 2);
    return 1 + 3 * (1 - accuracy);
  });
}
