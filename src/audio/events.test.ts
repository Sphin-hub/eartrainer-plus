import { describe, it, expect } from 'vitest';
import { scaleEvents, intervalEvents, chordEvents, totalDuration } from './events';
import { spellChord, formatNote, parseNote } from '../theory';

describe('scaleEvents', () => {
  it('plays C major up to the octave, one note per beat', () => {
    const e = scaleEvents(60, 'major', 'ascending', 0.5);
    expect(e.map((n) => n.midi)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
    expect(e.map((n) => n.start)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  });
  it('plays descending and up-and-down (top note not repeated)', () => {
    expect(scaleEvents(60, 'major', 'descending').map((n) => n.midi)).toEqual([72, 71, 69, 67, 65, 64, 62, 60]);
    expect(scaleEvents(60, 'major', 'both')).toHaveLength(15);
  });
  it('uses the raised 7th for harmonic minor', () => {
    expect(scaleEvents(60, 'harmonic-minor').map((n) => n.midi)).toEqual([60, 62, 63, 65, 67, 68, 71, 72]);
  });
});

describe('intervalEvents', () => {
  it('sequential intervals start one after the other', () => {
    const [a, b] = intervalEvents(60, 7, 'ascending', 0.8);
    expect([a!.midi, b!.midi]).toEqual([60, 67]);
    expect(b!.start).toBeGreaterThan(a!.start + a!.duration - 0.001);
  });
  it('descending goes down; harmonic starts together', () => {
    expect(intervalEvents(60, 7, 'descending').map((n) => n.midi)).toEqual([60, 53]);
    const h = intervalEvents(60, 7, 'harmonic');
    expect(h.map((n) => n.start)).toEqual([0, 0]);
  });
});

describe('chordEvents', () => {
  it('block chords start together; arpeggios roll upward', () => {
    expect(chordEvents(60, 'major').map((n) => n.start)).toEqual([0, 0, 0]);
    const arp = chordEvents(60, 'major', 0, 'arpeggio');
    expect(arp.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(arp.map((n) => n.start)).toEqual([0, 0.3, 0.6]);
  });
  it('respects inversion', () => {
    expect(chordEvents(60, 'major', 1).map((n) => n.midi)).toEqual([64, 67, 72]);
  });
  it('totalDuration finds the end of the last sound', () => {
    expect(totalDuration([])).toBe(0);
    expect(totalDuration(chordEvents(60, 'major', 0, 'arpeggio', 1.6))).toBeCloseTo(2.2);
  });
});

describe('spellChord', () => {
  const spell = (root: string, id: Parameters<typeof spellChord>[1]) => spellChord(parseNote(root), id).map((n) => formatNote(n));
  it('spells chords by stacking letters', () => {
    expect(spell('Eb', 'major')).toEqual(['Eb', 'G', 'Bb']);
    expect(spell('C', 'augmented')).toEqual(['C', 'E', 'G#']);
    expect(spell('F#', 'dim7')).toEqual(['F#', 'A', 'C', 'Eb']);
    expect(spell('Bb', 'dom7')).toEqual(['Bb', 'D', 'F', 'Ab']);
  });
});

import { FRETTED, chordToneMap, chordLabel } from '../theory';
describe('instruments', () => {
  it('has the standard open-string tunings', () => {
    expect(FRETTED.guitar.strings).toEqual([40, 45, 50, 55, 59, 64]);
    expect(FRETTED.bass.strings).toEqual([28, 33, 38, 43]);
    expect(FRETTED.ukulele.strings).toEqual([67, 60, 64, 69]);
  });
  it('finds chord tones on the fretboard by pitch class, with correct spelling', () => {
    const map = chordToneMap(parseNote('Eb'), 'minor');
    expect([...map.values()].map((n) => formatNote(n))).toEqual(['Eb', 'Gb', 'Bb']);
    expect(map.has((40 + 11) % 12)).toBe(true); // low E string, fret 11 sounds E♭ (pitch class 3)
  });
  it('names chords exactly', () => {
    expect(chordLabel(parseNote('C#'), 'min7')).toBe('C♯m7');
    expect(chordLabel(parseNote('F#'), 'min7b5')).toBe('F♯m7♭5');
    expect(chordLabel(parseNote('Bb'), 'maj7')).toBe('B♭maj7');
  });
});
