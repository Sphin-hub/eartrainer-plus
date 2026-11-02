/**
 * harmony.ts — building the chords that live INSIDE a key.
 *
 * Method: stack thirds using only the scale's own notes. For degree 3 of
 * C major: E, then G (skip F), then B (skip A) -> E G B = E minor.
 * No lookup table; the quality falls out of the scale.
 */
import { CHORDS, ChordId, classifyIntervals } from './chords';
import { NoteName, formatNote, letterAtOffset, mod, pitchClass, spellNote } from './notes';
import { ScaleId, buildScale } from './scales';

export interface DiatonicChord {
  degree: number;
  root: NoteName;
  chordId: ChordId;
  /** Spelled chord tones, root first. */
  notes: NoteName[];
  roman: string;
  /** e.g. 'Dm', 'Bdim', 'G7' */
  name: string;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const ROMAN_SUFFIX: Record<ChordId, string> = {
  major: '', minor: '', diminished: '°', augmented: '+',
  maj7: 'maj7', dom7: '7', min7: '7', min7b5: 'ø7', dim7: '°7', minMaj7: '(maj7)', augMaj7: '+maj7',
};

/** Roman numeral: UPPERCASE for major-third chords, lowercase for minor-third chords. */
export function romanNumeral(degree: number, chordId: ChordId): string {
  const base = NUMERALS[degree - 1];
  if (!base) throw new Error(`Invalid degree: ${degree}`);
  const majorThird = CHORDS[chordId].intervalsFromRoot[1] === 4;
  return (majorThird ? base : base.toLowerCase()) + ROMAN_SUFFIX[chordId];
}

/** The 7 diatonic chords of a scale: triads (size 3) or seventh chords (size 4). */
export function diatonicChords(tonic: NoteName, scaleId: ScaleId, size: 3 | 4 = 3): DiatonicChord[] {
  const scale = buildScale(tonic, scaleId);
  return scale.map((root, i) => {
    const notes = Array.from({ length: size }, (_, k) => scale[(i + 2 * k) % scale.length] as NoteName);
    const intervals = notes.map((n) => mod(pitchClass(n) - pitchClass(root), 12));
    const chordId = classifyIntervals(intervals);
    if (!chordId) throw new Error(`Unrecognised chord on degree ${i + 1}: [${intervals}]`);
    const degree = i + 1;
    return {
      degree,
      root,
      chordId,
      notes,
      roman: romanNumeral(degree, chordId),
      name: formatNote(root) + CHORDS[chordId].suffix,
    };
  });
}

/**
 * Correctly spelled tones of any chord on any root, built by stacking LETTERS
 * (root, +2 letters, +4, +6) and letting accidentals fill the gaps.
 * Eb major = Eb G Bb; F# dim7 = F# A C Eb.
 */
export function spellChord(root: NoteName, chordId: ChordId): NoteName[] {
  return CHORDS[chordId].intervalsFromRoot.map((semis, k) =>
    spellNote(letterAtOffset(root.letter, 2 * k), mod(pitchClass(root) + semis, 12)),
  );
}

/** Exact chord name for display: root + quality, e.g. C♯m7, B♭maj7, F♯m7♭5. */
export function chordLabel(root: NoteName, chordId: ChordId): string {
  return formatNote(root, 'unicode') + CHORDS[chordId].suffix.replace('b5', '♭5').replace('#5', '♯5');
}
