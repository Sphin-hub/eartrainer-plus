/**
 * intervals.ts — the distance between two pitches, measured in semitones.
 */

export type Direction = 'ascending' | 'descending' | 'harmonic';

export interface IntervalDefinition {
  semitones: number;
  short: string;
  name: string;
}

export const INTERVALS: IntervalDefinition[] = [
  { semitones: 0, short: 'P1', name: 'Unison' },
  { semitones: 1, short: 'm2', name: 'Minor 2nd' },
  { semitones: 2, short: 'M2', name: 'Major 2nd' },
  { semitones: 3, short: 'm3', name: 'Minor 3rd' },
  { semitones: 4, short: 'M3', name: 'Major 3rd' },
  { semitones: 5, short: 'P4', name: 'Perfect 4th' },
  { semitones: 6, short: 'TT', name: 'Tritone' },
  { semitones: 7, short: 'P5', name: 'Perfect 5th' },
  { semitones: 8, short: 'm6', name: 'Minor 6th' },
  { semitones: 9, short: 'M6', name: 'Major 6th' },
  { semitones: 10, short: 'm7', name: 'Minor 7th' },
  { semitones: 11, short: 'M7', name: 'Major 7th' },
  { semitones: 12, short: 'P8', name: 'Octave' },
];

export function intervalBySemitones(semitones: number): IntervalDefinition {
  const found = INTERVALS.find((i) => i.semitones === semitones);
  if (!found) throw new Error(`No interval defined for ${semitones} semitones`);
  return found;
}

export interface IntervalPlayback {
  /** MIDI notes in the order they should be heard. */
  notes: number[];
  /** True if both notes sound together (harmonic interval). */
  simultaneous: boolean;
}

/**
 * Notes to play for an interval starting from `startMidi`.
 *  - ascending:  start, then start + n
 *  - descending: start, then start - n
 *  - harmonic:   start and start + n together
 */
export function intervalNotes(startMidi: number, semitones: number, direction: Direction): IntervalPlayback {
  intervalBySemitones(semitones); // validates the size
  if (direction === 'descending') return { notes: [startMidi, startMidi - semitones], simultaneous: false };
  if (direction === 'harmonic') return { notes: [startMidi, startMidi + semitones], simultaneous: true };
  return { notes: [startMidi, startMidi + semitones], simultaneous: false };
}

/** Measure the interval between two MIDI notes (the reverse of intervalNotes). */
export function intervalBetween(
  fromMidi: number,
  toMidi: number,
): { semitones: number; direction: 'ascending' | 'descending' | 'unison' } {
  const diff = toMidi - fromMidi;
  return {
    semitones: Math.abs(diff),
    direction: diff > 0 ? 'ascending' : diff < 0 ? 'descending' : 'unison',
  };
}
