/** instruments.ts — fundamentals for other instruments: tunings and where notes live. */
import { NoteName, mod, pitchClass } from './notes';
import { ChordId } from './chords';
import { spellChord } from './harmony';

export type InstrumentId = 'piano' | 'guitar' | 'bass' | 'ukulele';
export interface FrettedDef { name: string; /** MIDI of each open string, lowest string first. */ strings: number[]; tuning: string; chordOctave: number }

export const FRETTED: Record<Exclude<InstrumentId, 'piano'>, FrettedDef> = {
  guitar: { name: 'Guitar', strings: [40, 45, 50, 55, 59, 64], tuning: 'E A D G B E (low to high)', chordOctave: 3 },
  bass: { name: 'Bass (4-string)', strings: [28, 33, 38, 43], tuning: 'E A D G (low to high)', chordOctave: 2 },
  ukulele: { name: 'Ukulele', strings: [67, 60, 64, 69], tuning: 'G C E A (G is the high re-entrant string)', chordOctave: 4 },
};

export const PC_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** Pitch class -> correctly spelled chord tone, so any fret or key can be tested against the chord. */
export const chordToneMap = (root: NoteName, chordId: ChordId): Map<number, NoteName> =>
  new Map(spellChord(root, chordId).map((n) => [mod(pitchClass(n), 12), n]));
