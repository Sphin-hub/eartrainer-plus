/** challenge.ts — question generation, answer validation and session scoring. Pure logic, no UI. */
import { chordEvents, cadenceEvents, progressionEvents, totalDuration, type NoteEvent } from '../audio/events';
import { CHORDS, MAJOR_KEYS, SCALES, buildScale, chordLabel, diatonicChords, formatNote, keysFor, parseNote, toMidi, type ChordId, type ScaleId } from '../theory';
import { PROGRESSIONS, romanLabel } from '../content/progressions';
import { pretty, type LevelConfig, type PathConfig } from '../content/paths';
import { makeQuestion } from './generator';
import type { Progress } from './progress';

export interface Option { id: string; label: string }
export interface ChallengeQuestion {
  id: string;
  prompt: string;
  options: Option[];
  correctOptionId: string;
  events: NoteEvent[];
  /** Human-readable skill, used for weak-spot tracking. */
  concept: string;
  /** Shown while practising, e.g. "G major" or "Root C♯". */
  keyLabel: string;
  /** Exact answer shown after answering, e.g. "C♯m7" or "I G → vi Em → V D → I G". */
  reveal: string;
  status: 'awaiting_answer' | 'answered' | 'timeout';
  points?: number;
}

type Rng = () => number;
const pick = <T,>(a: T[], rng: Rng): T => a[Math.floor(rng() * a.length)]!;
function shuffle<T>(a: T[], rng: Rng): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j]!, r[i]!]; }
  return r;
}
/** The correct id plus (count-1) distinct distractors from the allowed ids, in random order. */
const choose = (ids: string[], correct: string, count: number, rng: Rng): string[] =>
  shuffle([correct, ...shuffle(ids.filter((x) => x !== correct), rng).slice(0, count - 1)], rng);

const scaleName = (id: ScaleId) => (id === 'major' ? 'major' : id.replace('-', ' '));

export function makeChallengeQuestion(level: LevelConfig, rng: Rng, n: number, keyChoice = 'random'): ChallengeQuestion {
  const base = { id: `q${n}`, status: 'awaiting_answer' as const };
  const keyName = (picked: string) => (keyChoice === 'random' ? picked : keyChoice);
  if (level.kind === 'single_chord') {
    const id = pick(level.chords!, rng);
    const root = parseNote(keyName(pick(MAJOR_KEYS, rng)));
    return {
      ...base, prompt: 'Which chord is this?', correctOptionId: id, concept: CHORDS[id].name,
      keyLabel: `Root ${formatNote(root, 'unicode')}`, reveal: `${chordLabel(root, id)} (${CHORDS[id].name})`,
      options: choose(level.chords!, id, level.choices, rng).map((x) => ({ id: x, label: CHORDS[x as ChordId].name })),
      events: chordEvents(toMidi(root, 3), id),
    };
  }
  if (level.kind === 'single_note') {
    const scaleId = pick(level.scales!, rng);
    const scale = SCALES[scaleId];
    const weights = scale.semitonePattern.map((_, i) => (level.degrees!.includes(i + 1) ? 1 : 0));
    const g = makeQuestion(scaleId, rng, weights, undefined, keyChoice);
    const cad = cadenceEvents(g.tonic, g.tonicMidi, scaleId);
    const correct = `d${g.degreeIndex + 1}`;
    const keyLabel = `${formatNote(g.tonic, 'unicode')} ${scaleId === 'major' ? 'major' : scaleId.replace('-', ' ')}`;
    const noteName = formatNote(buildScale(g.tonic, scaleId)[g.degreeIndex]!, 'unicode');
    return {
      ...base, prompt: 'Which scale degree is the note?', correctOptionId: correct, keyLabel,
      concept: `${pretty(scale.degreeLabels[g.degreeIndex]!)} in ${scaleId === 'major' ? 'major' : scaleId.replace('-', ' ')}`,
      reveal: `${pretty(scale.degreeLabels[g.degreeIndex]!)} of ${keyLabel} = ${noteName}`,
      options: choose(level.degrees!.map((d) => `d${d}`), correct, level.choices, rng).map((x) => ({ id: x, label: pretty(scale.degreeLabels[Number(x.slice(1)) - 1]!) })),
      events: [...cad, { midi: g.targetMidi, start: totalDuration(cad) + 0.5, duration: 1.2, velocity: 0.9 }],
    };
  }
  if (level.kind === 'progression') {
    const defs = level.progressions!.map((id) => PROGRESSIONS.find((p) => p.id === id)!);
    const def = pick(defs, rng);
    const tonic = parseNote(keyName(pick(keysFor(def.scale), rng)));
    const chords = diatonicChords(tonic, def.scale, def.size ?? 3);
    const keyLabel = `${formatNote(tonic, 'unicode')} ${scaleName(def.scale)}`;
    const names = def.degrees.map((d) => chordLabel(chords[d - 1]!.root, chords[d - 1]!.chordId)).join(' → ');
    return {
      ...base, prompt: 'Which progression is this?', correctOptionId: def.id, concept: romanLabel(def), keyLabel,
      reveal: `${romanLabel(def)} in ${keyLabel}: ${names}`,
      options: choose(level.progressions!, def.id, level.choices, rng).map((id) => ({ id, label: romanLabel(defs.find((p) => p.id === id)!) })),
      events: progressionEvents(tonic, toMidi(tonic, 3), def.scale, def.degrees, 0.9, def.size ?? 3),
    };
  }
  const scaleId = pick(level.scales ?? (['major'] as ScaleId[]), rng);
  const tonic = parseNote(keyName(pick(keysFor(scaleId), rng)));
  const chords = diatonicChords(tonic, scaleId);
  const degrees = [1];
  while (degrees.length < 4) { const d = pick(level.degrees!, rng); if (d !== degrees[degrees.length - 1]) degrees.push(d); }
  const pos = 1 + Math.floor(rng() * 3);
  const correct = `d${degrees[pos]}`;
  const name = (d: number) => `${chords[d - 1]!.roman} ${chordLabel(chords[d - 1]!.root, chords[d - 1]!.chordId)}`;
  return {
    ...base, prompt: `Which chord is number ${pos + 1} of 4?`, correctOptionId: correct,
    concept: `${chords[degrees[pos]! - 1]!.roman} chord`,
    keyLabel: `${formatNote(tonic, 'unicode')} ${scaleName(scaleId)}`, reveal: `${degrees.map(name).join(' → ')} (chord ${pos + 1} was ${name(degrees[pos]!)})`,
    options: choose(level.degrees!.map((d) => `d${d}`), correct, level.choices, rng).map((o) => {
      const c = chords[Number(o.slice(1)) - 1]!;
      return { id: o, label: `${c.roman} · ${chordLabel(c.root, c.chordId)}` };
    }),
    events: progressionEvents(tonic, toMidi(tonic, 3), scaleId, degrees, 0.9),
  };
}

export const generateSet = (level: LevelConfig, rng: Rng, keyChoice = 'random'): ChallengeQuestion[] =>
  Array.from({ length: level.questions }, (_, i) => makeChallengeQuestion(level, rng, i + 1, keyChoice));

export interface AnswerRecord { questionId: string; selectedOptionId: string | null; correct: boolean; concept: string; status: 'answered' | 'timeout' }
export interface Session { score: number; combo: number; bestCombo: number; isPaused: boolean; answers: AnswerRecord[] }
export const newSession = (): Session => ({ score: 0, combo: 0, bestCombo: 0, isPaused: false, answers: [] });

/** Validate an answer exactly once. The question is locked BEFORE the score changes, so a double tap can't score twice. */
export function submitAnswer(question: ChallengeQuestion, selectedOptionId: string, session: Session) {
  if (session.isPaused || question.status !== 'awaiting_answer') return { accepted: false as const, reason: 'question_not_active' };
  if (!question.options.some((o) => o.id === selectedOptionId)) return { accepted: false as const, reason: 'invalid_option' };
  question.status = 'answered';
  const isCorrect = selectedOptionId === question.correctOptionId;
  if (isCorrect) {
    session.score += question.points ?? 1;
    session.combo += 1;
    session.bestCombo = Math.max(session.bestCombo, session.combo);
  } else {
    session.combo = 0;
  }
  session.answers.push({ questionId: question.id, selectedOptionId, correct: isCorrect, concept: question.concept, status: 'answered' });
  return { accepted: true as const, isCorrect, correctOptionId: question.correctOptionId, score: session.score, combo: session.combo };
}

/** Time ran out: unanswered, zero points, combo resets. Ignored if the question was already answered. */
export function timeoutQuestion(question: ChallengeQuestion, session: Session): boolean {
  if (session.isPaused || question.status !== 'awaiting_answer') return false;
  question.status = 'timeout';
  session.combo = 0;
  session.answers.push({ questionId: question.id, selectedOptionId: null, correct: false, concept: question.concept, status: 'timeout' });
  return true;
}

export function summarize(session: Session, total: number, mastery: number) {
  const correct = session.answers.filter((a) => a.correct).length;
  const unanswered = total - session.answers.filter((a) => a.status === 'answered').length;
  const accuracy = total ? correct / total : 0;
  const missed = new Map<string, number>();
  session.answers.filter((a) => !a.correct).forEach((a) => missed.set(a.concept, (missed.get(a.concept) ?? 0) + 1));
  return {
    score: session.score, total, correct, unanswered, incorrect: total - correct - unanswered,
    accuracy, bestCombo: session.bestCombo, passed: accuracy >= mastery,
    /** Concepts missed most often first: revise these. */
    revise: [...missed.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c),
  };
}

export const isUnlocked = (p: Progress, path: PathConfig, index: number): boolean =>
  index === 0 || !!p.mastery[`${path.id}:${path.levels[index - 1]!.id}`]?.passed;
