/**
 * chords.ts — chords as INTERVAL STRUCTURES above a root.
 *
 * A major triad is always [0, 4, 7] semitones above its root, whatever the key.
 */

export type ChordId =
  | 'major' | 'minor' | 'diminished' | 'augmented'
  | 'maj7' | 'dom7' | 'min7' | 'min7b5' | 'dim7' | 'minMaj7' | 'augMaj7';

export interface ChordDefinition {
  id: ChordId;
  name: string;
  intervalsFromRoot: number[];
  /** Text added after the root name: C + 'm7b5' = Cm7b5. */
  suffix: string;
  family: 'triad' | 'seventh';
}

export const CHORDS: Record<ChordId, ChordDefinition> = {
  major:      { id: 'major',      name: 'Major triad',          intervalsFromRoot: [0, 4, 7],     suffix: '',       family: 'triad' },
  minor:      { id: 'minor',      name: 'Minor triad',          intervalsFromRoot: [0, 3, 7],     suffix: 'm',      family: 'triad' },
  diminished: { id: 'diminished', name: 'Diminished triad',     intervalsFromRoot: [0, 3, 6],     suffix: 'dim',    family: 'triad' },
  augmented:  { id: 'augmented',  name: 'Augmented triad',      intervalsFromRoot: [0, 4, 8],     suffix: 'aug',    family: 'triad' },
  maj7:       { id: 'maj7',       name: 'Major 7th',            intervalsFromRoot: [0, 4, 7, 11], suffix: 'maj7',   family: 'seventh' },
  dom7:       { id: 'dom7',       name: 'Dominant 7th',         intervalsFromRoot: [0, 4, 7, 10], suffix: '7',      family: 'seventh' },
  min7:       { id: 'min7',       name: 'Minor 7th',            intervalsFromRoot: [0, 3, 7, 10], suffix: 'm7',     family: 'seventh' },
  min7b5:     { id: 'min7b5',     name: 'Half-diminished 7th',  intervalsFromRoot: [0, 3, 6, 10], suffix: 'm7b5',   family: 'seventh' },
  dim7:       { id: 'dim7',       name: 'Diminished 7th',       intervalsFromRoot: [0, 3, 6, 9],  suffix: 'dim7',   family: 'seventh' },
  minMaj7:    { id: 'minMaj7',    name: 'Minor-major 7th',      intervalsFromRoot: [0, 3, 7, 11], suffix: 'm(maj7)', family: 'seventh' },
  augMaj7:    { id: 'augMaj7',    name: 'Augmented major 7th',  intervalsFromRoot: [0, 4, 8, 11], suffix: 'maj7#5', family: 'seventh' },
};

/**
 * MIDI notes of a chord. Inversion 0 = root position; 1 = first inversion
 * (lowest note moves up an octave); and so on.
 */
export function buildChord(rootMidi: number, chordId: ChordId, inversion = 0): number[] {
  const notes = CHORDS[chordId].intervalsFromRoot.map((i) => rootMidi + i);
  if (!Number.isInteger(inversion) || inversion < 0 || inversion >= notes.length) {
    throw new Error(`Invalid inversion ${inversion} for ${chordId}`);
  }
  const moved = notes.slice(0, inversion).map((n) => n + 12);
  return [...notes.slice(inversion), ...moved].sort((a, b) => a - b);
}

/** Identify a chord from its stacked intervals above the root. Returns null if unknown. */
export function classifyIntervals(intervals: number[]): ChordId | null {
  const match = Object.values(CHORDS).find(
    (c) => c.intervalsFromRoot.length === intervals.length && c.intervalsFromRoot.every((v, i) => v === intervals[i]),
  );
  return match ? match.id : null;
}
