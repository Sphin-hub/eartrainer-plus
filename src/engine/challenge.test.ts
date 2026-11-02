import { describe, it, expect } from 'vitest';
import { PATHS, learnItems } from '../content/paths';
import { generateSet, makeChallengeQuestion, newSession, submitAnswer, summarize, timeoutQuestion, isUnlocked } from './challenge';
import { makeRng } from './generator';
import { finishLevel, type Progress } from './progress';

const q = () => makeChallengeQuestion(PATHS[1]!.levels[1]!, makeRng(5), 1);

describe('question generation', () => {
  it('only tests allowed material, with distinct options and exactly one correct answer, in every level', () => {
    for (const path of PATHS) for (const level of path.levels) {
      for (let seed = 1; seed <= 60; seed++) {
        const qs = generateSet(level, makeRng(seed));
        expect(qs).toHaveLength(level.questions);
        for (const x of qs) {
          const ids = x.options.map((o) => o.id);
          const where = `${path.id}/${level.id}`;
          expect(ids, where).toHaveLength(level.choices);
          expect(new Set(ids).size, where).toBe(ids.length);
          expect(new Set(x.options.map((o) => o.label)).size, where).toBe(ids.length);
          expect(ids.filter((i) => i === x.correctOptionId), where).toHaveLength(1);
          if (level.chords) expect(ids.every((i) => level.chords!.includes(i as never)), where).toBe(true);
          if (level.progressions) expect(ids.every((i) => level.progressions!.includes(i)), where).toBe(true);
          if (level.degrees) expect(ids.every((i) => level.degrees!.includes(Number(i.slice(1)))), where).toBe(true);
          expect(x.events.length, where).toBeGreaterThan(0);
        }
      }
    }
  });
  it('is reproducible and Learn items exist for every level', () => {
    const a = generateSet(PATHS[0]!.levels[0]!, makeRng(9)).map((x) => x.correctOptionId);
    expect(generateSet(PATHS[0]!.levels[0]!, makeRng(9)).map((x) => x.correctOptionId)).toEqual(a);
    for (const p of PATHS) for (const l of p.levels) expect(learnItems(l).length).toBeGreaterThan(0);
  });
});

describe('submitAnswer', () => {
  it('scores a correct answer once, and ignores a duplicate tap', () => {
    const s = newSession(), question = q();
    expect(submitAnswer(question, question.correctOptionId, s)).toMatchObject({ accepted: true, isCorrect: true, score: 1, combo: 1 });
    expect(submitAnswer(question, question.correctOptionId, s)).toMatchObject({ accepted: false });
    expect(s.score).toBe(1);
    expect(s.answers).toHaveLength(1);
  });
  it('resets the combo on a wrong answer but keeps the best combo', () => {
    const s = newSession(), a = q(), b = q(), c = q();
    submitAnswer(a, a.correctOptionId, s); submitAnswer(b, b.correctOptionId, s);
    submitAnswer(c, c.options.find((o) => o.id !== c.correctOptionId)!.id, s);
    expect(s).toMatchObject({ score: 2, combo: 0, bestCombo: 2 });
  });
  it('rejects answers while paused and invalid options', () => {
    const s = newSession(), question = q();
    s.isPaused = true;
    expect(submitAnswer(question, question.correctOptionId, s).accepted).toBe(false);
    s.isPaused = false;
    expect(submitAnswer(question, 'nope', s)).toMatchObject({ accepted: false, reason: 'invalid_option' });
    expect(question.status).toBe('awaiting_answer');
  });
  it('handles timeouts once and ignores a late tap', () => {
    const s = newSession(), question = q();
    s.combo = 3;
    expect(timeoutQuestion(question, s)).toBe(true);
    expect(timeoutQuestion(question, s)).toBe(false);
    expect(submitAnswer(question, question.correctOptionId, s).accepted).toBe(false);
    expect(s).toMatchObject({ score: 0, combo: 0 });
  });
});

describe('results and unlocks', () => {
  it('summarises accuracy, unanswered and what to revise', () => {
    const s = newSession(), qs = generateSet(PATHS[1]!.levels[1]!, makeRng(2));
    qs.slice(0, 8).forEach((x) => submitAnswer(x, x.correctOptionId, s));
    submitAnswer(qs[8]!, qs[8]!.options.find((o) => o.id !== qs[8]!.correctOptionId)!.id, s);
    timeoutQuestion(qs[9]!, s);
    const r = summarize(s, 10, 0.8);
    expect(r).toMatchObject({ correct: 8, incorrect: 1, unanswered: 1, accuracy: 0.8, passed: true });
    expect(r.revise).toHaveLength(2);
  });
  it('unlocks the next level only after the previous one is passed', () => {
    const p: Progress = { xp: 0, runStreak: 0, dayStreak: 0, lastDay: '', stats: {}, mastery: {} };
    const path = PATHS[1]!;
    expect(isUnlocked(p, path, 0)).toBe(true);
    expect(isUnlocked(p, path, 1)).toBe(false);
    const failed = finishLevel(p, 'sevenths:beginner', 0.5, false, 2);
    expect(isUnlocked(failed, path, 1)).toBe(false);
    const passed = finishLevel(failed, 'sevenths:beginner', 0.9, true, 4);
    expect(isUnlocked(passed, path, 1)).toBe(true);
    expect(finishLevel(passed, 'sevenths:beginner', 0.1, false, 0).mastery['sevenths:beginner']).toEqual({ best: 0.9, passed: true, bestCombo: 4 });
  });
});

describe('exact names and key choice', () => {
  const lv = (p: string, l: string) => PATHS.find((x) => x.id === p)!.levels.find((y) => y.id === l)!;
  const get = (p: string, l: string, key?: string) => generateSet(lv(p, l), makeRng(4), key);
  it('names the exact chord that was played', () => {
    for (const x of get('chord-quality', 'beginner', 'Eb')) {
      expect(x.keyLabel).toBe('Root E♭');
      expect(x.reveal).toMatch(/^E♭m? \((Major|Minor) triad\)$/);
    }
    expect(get('sevenths', 'intermediate', 'F#').every((x) => /^F♯(maj7|m7|7|m7♭5) \(/.test(x.reveal))).toBe(true);
  });
  it('shows the key and the full progression for chord-in-context questions', () => {
    const x = get('major-harmony', 'beginner', 'G')[0]!;
    expect(x.keyLabel).toBe('G major');
    expect(x.reveal).toMatch(/^I G → .* → .*→ .*\(chord \d was /);
  });
  it('names the note and key for scale-degree questions', () => {
    const x = Array.from({ length: 30 }, (_, i) => generateSet(lv('minor-notes', 'natural'), makeRng(i + 1), 'C')).flat().find((q) => q.concept.startsWith('♭6'))!;
    expect(x).toBeDefined();
    expect(x.keyLabel).toMatch(/^C natural minor$/);
    expect(x.reveal).toMatch(/♭6 of C natural minor = A♭/);
  });
  it('a fixed key is used for every question; random mixes keys', () => {
    expect(new Set(get('chord-quality', 'beginner', 'D').map((x) => x.keyLabel)).size).toBe(1);
    expect(new Set(get('chord-quality', 'beginner').map((x) => x.keyLabel)).size).toBeGreaterThan(1);
  });
});

describe('progressions and minor types', () => {
  it('names the progression and its exact chords', () => {
    const x = generateSet(PATHS.find((p) => p.id === 'major-progressions')!.levels[0]!, makeRng(8), 'C')[0]!;
    expect(x.keyLabel).toBe('C major');
    expect(x.reveal).toMatch(/^I – .* in C major: C → /);
  });
  it('every defined progression resolves to real diatonic chords, with unique ids', async () => {
    const { PROGRESSIONS } = await import('../content/progressions');
    const { diatonicChords, parseNote } = await import('../theory');
    expect(new Set(PROGRESSIONS.map((p) => p.id)).size).toBe(PROGRESSIONS.length);
    for (const p of PROGRESSIONS) expect(() => diatonicChords(parseNote('C'), p.scale, p.size ?? 3), p.id).not.toThrow();
  });
  it('melodic minor chords are built correctly', async () => {
    const { diatonicChords, parseNote } = await import('../theory');
    expect(diatonicChords(parseNote('C'), 'melodic-minor').map((c) => c.name)).toEqual(['Cm', 'Dm', 'Ebaug', 'F', 'G', 'Adim', 'Bdim']);
    expect(diatonicChords(parseNote('C'), 'melodic-minor', 4).map((c) => c.name)).toEqual(['Cm(maj7)', 'Dm7', 'Ebmaj7#5', 'F7', 'G7', 'Am7b5', 'Bm7b5']);
  });
});
