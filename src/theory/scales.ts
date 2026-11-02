/**
 * scales.ts — scales as FORMULAS, not hard-coded note lists.
 *
 * A scale = a pattern of semitones above the tonic + a label for each degree.
 * Give it any tonic and it builds (and correctly spells) the scale in that key.
 */
import { NoteName, letterAtOffset, mod, pitchClass, spellNote } from './notes';

export type ScaleId = 'major' | 'natural-minor' | 'harmonic-minor' | 'melodic-minor';

export interface ScaleDefinition {
  id: ScaleId;
  name: string;
  /** Semitones above the tonic for each degree. */
  semitonePattern: number[];
  /** Degree labels. 'b3' = flattened 3rd. The digit says which LETTER NAME the degree uses. */
  degreeLabels: string[];
}

export const SCALES: Record<ScaleId, ScaleDefinition> = {
  major: {
    id: 'major',
    name: 'Major (Ionian)',
    semitonePattern: [0, 2, 4, 5, 7, 9, 11],
    degreeLabels: ['1', '2', '3', '4', '5', '6', '7'],
  },
  'natural-minor': {
    id: 'natural-minor',
    name: 'Natural minor (Aeolian)',
    semitonePattern: [0, 2, 3, 5, 7, 8, 10],
    degreeLabels: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
  },
  // Same as natural minor but with a RAISED 7th (11, not 10): the leading tone.
  'harmonic-minor': {
    id: 'harmonic-minor',
    name: 'Harmonic minor',
    semitonePattern: [0, 2, 3, 5, 7, 8, 11],
    degreeLabels: ['1', '2', 'b3', '4', '5', 'b6', '7'],
  },
  // Jazz minor: minor with a raised 6th AND 7th, the same ascending and descending.
  'melodic-minor': {
    id: 'melodic-minor',
    name: 'Melodic minor (jazz)',
    semitonePattern: [0, 2, 3, 5, 7, 9, 11],
    degreeLabels: ['1', '2', 'b3', '4', '5', '6', '7'],
  },
};

/** '1' -> 1, 'b3' -> 3, '#4' -> 4 (the degree number without its accidental). */
export function degreeNumber(label: string): number {
  return parseInt(label.replace(/[b#]/g, ''), 10);
}

/**
 * Build a scale in any key, with correct spelling.
 * For degree N we use the letter N-1 steps above the tonic's letter,
 * then add whatever accidental is needed to land on the right pitch.
 */
export function buildScale(tonic: NoteName, scaleId: ScaleId): NoteName[] {
  const scale = SCALES[scaleId];
  return scale.semitonePattern.map((semis, i) => {
    const label = scale.degreeLabels[i] as string;
    const letter = letterAtOffset(tonic.letter, degreeNumber(label) - 1);
    return spellNote(letter, mod(pitchClass(tonic) + semis, 12));
  });
}

/**
 * MIDI note for scale degree `degree` (1-based) above a tonic MIDI note.
 * Degree 8 = the octave, 9 = the 2nd an octave up, and so on.
 */
export function degreeToMidi(tonicMidi: number, scaleId: ScaleId, degree: number): number {
  if (!Number.isInteger(degree) || degree < 1) throw new Error(`Invalid scale degree: ${degree}`);
  const pattern = SCALES[scaleId].semitonePattern;
  const octaves = Math.floor((degree - 1) / pattern.length);
  const index = (degree - 1) % pattern.length;
  return tonicMidi + (pattern[index] as number) + 12 * octaves;
}

/** Sensible, readable tonic choices for the key picker (avoids keys like Db minor with 8 flats). */
export const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
export const keysFor = (scaleId: ScaleId): string[] => (scaleId === 'major' ? MAJOR_KEYS : MINOR_KEYS);
