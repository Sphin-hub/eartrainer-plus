/**
 * events.ts — turn theory into a TIMELINE of notes. Pure data, no sound.
 *
 * Keeping "what to play" separate from "how it sounds" means we can unit-test
 * the musical content without a browser or speakers.
 * Times are in seconds from the start of the sequence.
 */
import { ChordId, buildChord } from '../theory/chords';
import { Direction, intervalNotes } from '../theory/intervals';
import { diatonicChords } from '../theory/harmony';
import { NoteName } from '../theory/notes';
import { SCALES, ScaleId, degreeToMidi } from '../theory/scales';

export interface NoteEvent {
  midi: number;
  start: number;
  duration: number;
  /** 0–1 loudness. */
  velocity: number;
}

/** When the last sound ends (not counting the release tail). */
export const totalDuration = (events: NoteEvent[]): number =>
  events.reduce((end, e) => Math.max(end, e.start + e.duration), 0);

/** A scale from the tonic up to the octave, down, or both (top note not repeated). */
export function scaleEvents(
  tonicMidi: number,
  scaleId: ScaleId,
  direction: 'ascending' | 'descending' | 'both' = 'ascending',
  noteDuration = 0.5,
): NoteEvent[] {
  const count = SCALES[scaleId].semitonePattern.length;
  const up = Array.from({ length: count + 1 }, (_, i) => degreeToMidi(tonicMidi, scaleId, i + 1));
  const midis =
    direction === 'ascending' ? up : direction === 'descending' ? [...up].reverse() : [...up, ...up.slice(0, -1).reverse()];
  return midis.map((midi, i) => ({ midi, start: i * noteDuration, duration: noteDuration * 0.9, velocity: 0.8 }));
}

/** Two notes: one after the other, or together for a harmonic interval. */
export function intervalEvents(startMidi: number, semitones: number, direction: Direction, noteDuration = 0.8): NoteEvent[] {
  const { notes, simultaneous } = intervalNotes(startMidi, semitones, direction);
  return notes.map((midi, i) => ({
    midi,
    start: simultaneous ? 0 : i * (noteDuration + 0.1),
    duration: simultaneous ? 1.4 : noteDuration,
    velocity: 0.8,
  }));
}

/** A chord struck together (block) or rolled upward (arpeggio). */
export function chordEvents(
  rootMidi: number,
  chordId: ChordId,
  inversion = 0,
  style: 'block' | 'arpeggio' = 'block',
  duration = 1.6,
): NoteEvent[] {
  return buildChord(rootMidi, chordId, inversion).map((midi, i) => ({
    midi,
    start: style === 'arpeggio' ? i * 0.3 : 0,
    duration,
    velocity: 0.8,
  }));
}

/**
 * Chords on the given scale degrees, voiced smoothly: each chord picks the inversion/octave
 * closest to the previous chord. Minor scales use harmonic minor so V is major.
 */
export function progressionEvents(tonic: NoteName, tonicMidi: number, scaleId: ScaleId, degrees: number[], step = 0.7, size: 3 | 4 = 3): NoteEvent[] {
  const base: ScaleId = scaleId;
  const chords = diatonicChords(tonic, base, size);
  let prev: number[] = [];
  return degrees.flatMap((degree, i, all) => {
    const chord = chords[degree - 1]!;
    const root = degreeToMidi(tonicMidi, base, degree);
    let best = buildChord(root, chord.chordId);
    if (i > 0) {
      let cost = Infinity;
      for (const shift of [-12, 0, 12]) {
        for (let inv = 0; inv < size; inv++) {
          const notes = buildChord(root + shift, chord.chordId, inv);
          const c = notes.reduce((sum, n, k) => sum + Math.abs(n - prev[k]!), 0);
          if (c < cost) { cost = c; best = notes; }
        }
      }
    }
    prev = best;
    const last = i === all.length - 1;
    return best.map((midi) => ({ midi, start: i * step, duration: last ? step * 1.4 : step * 0.95, velocity: 0.7 }));
  });
}

/** I – IV – V – I, used to establish a key. */
export const cadenceEvents = (tonic: NoteName, tonicMidi: number, scaleId: ScaleId, step = 0.7): NoteEvent[] =>
  progressionEvents(tonic, tonicMidi, scaleId === 'major' ? 'major' : 'harmonic-minor', [1, 4, 5, 1], step);
