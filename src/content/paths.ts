/**
 * paths.ts — learning paths as DATA. Add or tune a path/level here; no screen code changes.
 * Teaching (learnItems) and testing (challenge.ts) both read the same config, so they can't disagree.
 */
import { chordEvents, cadenceEvents, progressionEvents, totalDuration, type NoteEvent } from '../audio/events';
import { CHORDS, SCALES, chordLabel, diatonicChords, parseNote, type ChordId, type ScaleId } from '../theory';
import { PROGRESSIONS, romanLabel } from './progressions';

export type ChallengeKind = 'single_chord' | 'single_note' | 'chord_in_context' | 'progression';

export interface LevelConfig {
  id: string;
  title: string;
  kind: ChallengeKind;
  /** single_chord: chord types that may appear. */
  chords?: ChordId[];
  /** single_note: scales that may appear. */
  scales?: ScaleId[];
  /** single_note / chord_in_context: allowed scale degrees, 1-based. */
  degrees?: number[];
  /** progression: ids from PROGRESSIONS that may appear. */
  progressions?: string[];
  choices: 2 | 4;
  /** Seconds per question in timed play (starts after the audio ends). */
  seconds: number;
  /** Required accuracy, 0–1. */
  mastery: number;
  questions: number;
}
export interface PathConfig { id: string; title: string; blurb: string; levels: LevelConfig[] }

const L = (o: Omit<LevelConfig, 'questions'> & { questions?: number }): LevelConfig => ({ questions: 10, ...o });
const ALL = [1, 2, 3, 4, 5, 6, 7];
const pids = (scale: ScaleId, size: 3 | 4 = 3) => PROGRESSIONS.filter((x) => x.scale === scale && (x.size ?? 3) === size).map((x) => x.id);
const MINORS: { id: string; title: string; scale: ScaleId }[] = [
  { id: 'natural', title: 'Natural minor', scale: 'natural-minor' },
  { id: 'harmonic', title: 'Harmonic minor', scale: 'harmonic-minor' },
  { id: 'melodic', title: 'Melodic minor (jazz)', scale: 'melodic-minor' },
];

export const PATHS: PathConfig[] = [
  {
    id: 'chord-quality', title: 'Chord quality', blurb: 'Hear the colour of a triad: major, minor, diminished, augmented.',
    levels: [
      L({ id: 'beginner', title: 'Beginner', kind: 'single_chord', chords: ['major', 'minor'], choices: 2, seconds: 10, mastery: 0.8 }),
      L({ id: 'intermediate', title: 'Intermediate', kind: 'single_chord', chords: ['major', 'minor', 'diminished', 'augmented'], choices: 4, seconds: 10, mastery: 0.8 }),
    ],
  },
  {
    id: 'sevenths', title: 'Seventh chords', blurb: 'Tell maj7, m7, dominant 7 and the diminished family apart.',
    levels: [
      L({ id: 'beginner', title: 'Beginner', kind: 'single_chord', chords: ['maj7', 'min7'], choices: 2, seconds: 10, mastery: 0.8 }),
      L({ id: 'intermediate', title: 'Intermediate', kind: 'single_chord', chords: ['maj7', 'min7', 'dom7', 'min7b5'], choices: 4, seconds: 10, mastery: 0.85 }),
      L({ id: 'advanced', title: 'Advanced', kind: 'single_chord', chords: ['maj7', 'min7', 'dom7', 'min7b5', 'dim7', 'minMaj7'], choices: 4, seconds: 9, mastery: 0.85 }),
    ],
  },
  {
    id: 'major-harmony', title: 'Major scale: chords', blurb: 'The chords the major scale makes (I ii iii IV V vi vii°). Name the chord at a position in a progression.',
    levels: [
      L({ id: 'beginner', title: 'Beginner: I IV V', kind: 'chord_in_context', scales: ['major'], degrees: [1, 4, 5], choices: 2, seconds: 12, mastery: 0.8 }),
      L({ id: 'intermediate', title: 'Intermediate', kind: 'chord_in_context', scales: ['major'], degrees: [1, 2, 4, 5, 6], choices: 4, seconds: 12, mastery: 0.8 }),
      L({ id: 'advanced', title: 'All seven chords', kind: 'chord_in_context', scales: ['major'], degrees: ALL, choices: 4, seconds: 12, mastery: 0.85 }),
    ],
  },
  {
    id: 'major-progressions', title: 'Major progressions', blurb: 'Recognise whole progressions: cadences, pop, doo-wop, ii–V–I and jazz sevenths.',
    levels: [
      L({ id: 'beginner', title: 'Beginner: 4 classics', kind: 'progression', progressions: pids('major').slice(0, 4), choices: 2, seconds: 14, mastery: 0.8 }),
      L({ id: 'intermediate', title: 'All 8 triad progressions', kind: 'progression', progressions: pids('major'), choices: 4, seconds: 14, mastery: 0.8 }),
      L({ id: 'advanced', title: 'Jazz sevenths', kind: 'progression', progressions: pids('major', 4), choices: 4, seconds: 14, mastery: 0.85 }),
    ],
  },
  {
    id: 'minor-harmony', title: 'Minor scales: chords', blurb: 'Chords of natural, harmonic and melodic minor, including the augmented and diminished ones.',
    levels: MINORS.map((m) => L({ id: m.id, title: m.title, kind: 'chord_in_context', scales: [m.scale], degrees: ALL, choices: 4, seconds: 12, mastery: 0.8 })),
  },
  {
    id: 'minor-progressions', title: 'Minor progressions', blurb: 'Progressions in every kind of minor key, from rock minor to jazz minor.',
    levels: MINORS.map((m) => L({ id: m.id, title: m.title, kind: 'progression', progressions: pids(m.scale), choices: 4, seconds: 14, mastery: 0.8 })),
  },
  {
    id: 'major-notes', title: 'Major scale: notes', blurb: 'Learn each note of the major scale by ear against its tonic.',
    levels: [
      L({ id: 'beginner', title: 'Beginner: 1 · 3 · 5', kind: 'single_note', scales: ['major'], degrees: [1, 3, 5], choices: 2, seconds: 10, mastery: 0.8 }),
      L({ id: 'all', title: 'All seven degrees', kind: 'single_note', scales: ['major'], degrees: ALL, choices: 4, seconds: 10, mastery: 0.8 }),
    ],
  },
  {
    id: 'minor-notes', title: 'Minor scales: notes', blurb: 'Pick out individual notes in natural, harmonic and melodic minor.',
    levels: MINORS.map((m) => L({ id: m.id, title: m.title, kind: 'single_note', scales: [m.scale], degrees: ALL, choices: 4, seconds: 10, mastery: 0.8 })),
  },
];

export const pretty = (label: string) => label.replace('b', '♭').replace('#', '♯');
const FORMULA: Record<number, string> = { 0: '1', 3: '♭3', 4: '3', 6: '♭5', 7: '5', 8: '♯5', 9: '♭♭7', 10: '♭7', 11: '7' };

export interface LearnItem { title: string; sub: string; events: NoteEvent[] }

/** What the Learn list shows (and plays) for a level — built from the same config the challenge uses. */
export function learnItems(level: LevelConfig): LearnItem[] {
  const c = parseNote('C');
  if (level.kind === 'single_chord') {
    return level.chords!.map((id) => ({
      title: CHORDS[id].name,
      sub: `C${CHORDS[id].suffix} · ${CHORDS[id].intervalsFromRoot.map((i) => FORMULA[i]).join(' ')}`,
      events: chordEvents(48, id),
    }));
  }
  if (level.kind === 'single_note') {
    const scaleId = level.scales![0]!;
    const scale = SCALES[scaleId];
    return level.degrees!.map((d) => {
      const cad = cadenceEvents(c, 48, scaleId);
      return {
        title: pretty(scale.degreeLabels[d - 1]!),
        sub: `${scale.name}, +${scale.semitonePattern[d - 1]} semitones`,
        events: [...cad, { midi: 48 + scale.semitonePattern[d - 1]!, start: totalDuration(cad) + 0.5, duration: 1.2, velocity: 0.9 }],
      };
    });
  }
  if (level.kind === 'progression') {
    return level.progressions!.map((id) => {
      const def = PROGRESSIONS.find((x) => x.id === id)!;
      return { title: romanLabel(def), sub: `${def.note} · ${SCALES[def.scale].name}`, events: progressionEvents(c, 48, def.scale, def.degrees, 0.8, def.size ?? 3) };
    });
  }
  const scaleId = level.scales?.[0] ?? 'major';
  const chords = diatonicChords(c, scaleId);
  return level.degrees!.map((d) => ({
    title: chords[d - 1]!.roman,
    sub: `${chordLabel(chords[d - 1]!.root, chords[d - 1]!.chordId)} in C ${SCALES[scaleId].name}, heard after the tonic`,
    events: progressionEvents(c, 48, scaleId, [1, d], 0.9),
  }));
}
