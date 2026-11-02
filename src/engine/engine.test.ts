import { describe, it, expect } from 'vitest';
import { makeRng, makeQuestion, isCorrect, weightsFor } from './generator';
import { record, type Progress } from './progress';
import { cadenceEvents } from '../audio/events';
import { MAJOR_KEYS, MINOR_KEYS, SCALES, parseNote, type ScaleId } from '../theory';

describe('generator', () => {
  it('is reproducible for a seed', () => {
    const run = (seed: number) => { const r = makeRng(seed); return Array.from({ length: 5 }, () => makeQuestion('major', r, [1, 1, 1, 1, 1, 1, 1]).targetMidi); };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });
  it('target pitch always matches the scale degree and never repeats the previous degree', () => {
    const r = makeRng(1);
    let prev;
    for (const id of ['major', 'natural-minor', 'harmonic-minor'] as ScaleId[]) {
      for (let n = 0; n < 200; n++) {
        const q = makeQuestion(id, r, [1, 1, 1, 1, 1, 1, 1], prev);
        expect((q.targetMidi - q.tonicMidi) % 12).toBe(SCALES[id].semitonePattern[q.degreeIndex]);
        if (prev?.scaleId === id) expect(q.degreeIndex).not.toBe(prev.degreeIndex);
        prev = q;
      }
    }
  });
  it('checks answers against the generated degree and favours weak degrees', () => {
    const q = makeQuestion('major', makeRng(3), [1, 1, 1, 1, 1, 1, 1]);
    expect(isCorrect(q, q.degreeIndex)).toBe(true);
    expect(isCorrect(q, (q.degreeIndex + 1) % 7)).toBe(false);
    const w = weightsFor('major', { 'major:5': { right: 0, total: 10 }, 'major:0': { right: 10, total: 10 } });
    expect(w[5]).toBeGreaterThan(w[0]!);
  });
});

describe('progress', () => {
  const base: Progress = { xp: 0, runStreak: 0, dayStreak: 0, lastDay: '', stats: {}, mastery: {} };
  it('awards XP with streak bonus and resets the run on a miss', () => {
    const a = record(base, 'major:0', true);
    const b = record(a, 'major:1', true);
    expect(b.xp).toBeGreaterThan(a.xp);
    const c = record(b, 'major:2', false);
    expect(c.runStreak).toBe(0);
    expect(c.stats['major:2']).toEqual({ right: 0, total: 1 });
  });
  it('counts consecutive days', () => {
    const d1 = record(base, 'k', true, new Date('2026-10-20T10:00:00Z'));
    expect(record(d1, 'k', true, new Date('2026-10-21T10:00:00Z')).dayStreak).toBe(2);
    expect(record(d1, 'k', true, new Date('2026-10-25T10:00:00Z')).dayStreak).toBe(1);
  });
});

describe('cadenceEvents', () => {
  it('plays four chords and voice-leads smoothly in every key', () => {
    for (const [scale, keys] of [['major', MAJOR_KEYS], ['natural-minor', MINOR_KEYS], ['harmonic-minor', MINOR_KEYS]] as const) {
      for (const key of keys) {
        const tonic = parseNote(key);
        const ev = cadenceEvents(tonic, 48 + ((['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(tonic.letter) * 2) % 12), scale);
        const chords = [0, 1, 2, 3].map((i) => ev.filter((e) => e.start === i * 0.7).map((e) => e.midi));
        expect(chords.every((c) => c.length === 3), `${key} ${scale}`).toBe(true);
        for (let i = 1; i < 4; i++) chords[i]!.forEach((n, k) => expect(Math.abs(n - chords[i - 1]![k]!), `${key} ${scale}`).toBeLessThanOrEqual(5));
      }
    }
  });
});
