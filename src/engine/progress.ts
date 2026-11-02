/** progress.ts — XP, streaks, per-concept accuracy and level mastery, saved in localStorage. */
export interface Mastery { best: number; passed: boolean; bestCombo: number }
export interface Progress {
  xp: number;
  runStreak: number;
  dayStreak: number;
  lastDay: string;
  /** Accuracy per concept ("Minor 7th", "V chord", ...). Only challenge answers are recorded. */
  stats: Record<string, { right: number; total: number }>;
  /** Keyed "pathId:levelId". */
  mastery: Record<string, Mastery>;
  /** Remembered choices. key: 'random' or a tonic name like 'Eb'. */
  settings?: { key: string };
}
const KEY = 'eartrainer.progress.v1';
const day = (d = new Date()) => d.toISOString().slice(0, 10);
const fresh = (): Progress => ({ xp: 0, runStreak: 0, dayStreak: 0, lastDay: '', stats: {}, mastery: {} });

function save(p: Progress): Progress {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable: keep playing */ }
  return p;
}

export function loadProgress(): Progress {
  try {
    return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return fresh();
  }
}

export function record(p: Progress, concept: string, correct: boolean, now = new Date()): Progress {
  const s = p.stats[concept] ?? { right: 0, total: 0 };
  const yesterday = day(new Date(now.getTime() - 864e5));
  const dayStreak = p.lastDay === day(now) ? p.dayStreak : p.lastDay === yesterday ? p.dayStreak + 1 : 1;
  const runStreak = correct ? p.runStreak + 1 : 0;
  return save({
    ...p,
    xp: p.xp + (correct ? 10 + Math.min(runStreak, 5) * 5 : 0),
    runStreak, dayStreak, lastDay: day(now),
    stats: { ...p.stats, [concept]: { right: s.right + (correct ? 1 : 0), total: s.total + 1 } },
  });
}

/** Store the best result for a level; `passed` never goes back to false. */
export function finishLevel(p: Progress, key: string, accuracy: number, passed: boolean, bestCombo: number): Progress {
  const old = p.mastery[key];
  return save({
    ...p,
    mastery: { ...p.mastery, [key]: { best: Math.max(old?.best ?? 0, accuracy), passed: passed || !!old?.passed, bestCombo: Math.max(old?.bestCombo ?? 0, bestCombo) } },
  });
}

export const setKeyChoice = (p: Progress, key: string): Progress => save({ ...p, settings: { ...p.settings, key } });
