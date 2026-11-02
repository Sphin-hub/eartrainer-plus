/**
 * notes.ts — the foundation: PITCH vs. SPELLING
 *
 * Two different ideas hide inside "a note":
 *   1. PITCH    — which key on the piano (a MIDI number: 60 = middle C)
 *   2. SPELLING — what we CALL it (A# and Bb are the same pitch, different names)
 *
 * Spelling matters: F# major is F# G# A# B C# D# E# (E#, not F),
 * because a scale uses every letter name exactly once. So we store
 * spelling separately from pitch.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

/** Semitones above C for each natural (white-key) letter. */
const LETTER_TO_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A spelled note: a letter plus an accidental (+1 = sharp, -1 = flat, +2 = double sharp...). */
export interface NoteName {
  letter: Letter;
  accidental: number;
}

/** Always-positive modulo (JS's % can return negatives). */
export const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** Pitch class: 0–11, ignoring octave and spelling. C=0, C#/Db=1 ... B=11. */
export function pitchClass(note: NoteName): number {
  return mod(LETTER_TO_PC[note.letter] + note.accidental, 12);
}

/** Parse 'F#', 'Bb', 'C', 'F##' (also accepts ♯ and ♭). Letter must be uppercase. */
export function parseNote(text: string): NoteName {
  const match = /^([A-G])(#{1,2}|b{1,2}|♯{1,2}|♭{1,2})?$/.exec(text.trim());
  if (!match) throw new Error(`Cannot parse note name: "${text}"`);
  const letter = match[1] as Letter;
  const acc = match[2];
  if (!acc) return { letter, accidental: 0 };
  const sign = acc[0] === '#' || acc[0] === '♯' ? 1 : -1;
  return { letter, accidental: sign * acc.length };
}

/** Turn a NoteName into text. ASCII ('F#') for code/tests, unicode ('F♯') for the UI. */
export function formatNote(note: NoteName, style: 'ascii' | 'unicode' = 'ascii'): string {
  const sharp = style === 'unicode' ? '♯' : '#';
  const flat = style === 'unicode' ? '♭' : 'b';
  const marks = note.accidental >= 0 ? sharp.repeat(note.accidental) : flat.repeat(-note.accidental);
  return note.letter + marks;
}

/** Index of a letter in C D E F G A B (C=0 ... B=6). */
export const letterIndex = (letter: Letter): number => LETTERS.indexOf(letter);

/** The letter `offset` steps above `letter`, wrapping around (E + 3 steps = A). */
export function letterAtOffset(letter: Letter, offset: number): Letter {
  return LETTERS[mod(letterIndex(letter) + offset, 7)] as Letter;
}

/**
 * Spell a target pitch class using a REQUIRED letter.
 * Example: letter F, target pitch class 6 -> F# (accidental +1).
 * This is the trick that gives scales correct spelling: choose the letter first
 * (by scale degree), then let the accidental fill the gap.
 */
export function spellNote(letter: Letter, targetPitchClass: number): NoteName {
  const diff = mod(targetPitchClass - LETTER_TO_PC[letter] + 6, 12) - 6; // range -6..5
  return { letter, accidental: diff };
}

/**
 * MIDI number for a spelled note in a given octave (scientific pitch: C4 = 60 = middle C).
 * B#3 = 60 and Cb4 = 59 work correctly because the octave follows the LETTER.
 */
export function toMidi(note: NoteName, octave: number): number {
  return 12 * (octave + 1) + LETTER_TO_PC[note.letter] + note.accidental;
}

/** Frequency in Hz using equal temperament. A4 (MIDI 69) = 440 Hz by default. */
export function midiToFrequency(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}
