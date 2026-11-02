import { describe, it, expect } from 'vitest';
import {
  parseNote, formatNote, pitchClass, toMidi, midiToFrequency, spellNote,
  SCALES, buildScale, degreeToMidi, MAJOR_KEYS, MINOR_KEYS, ScaleId,
  INTERVALS, intervalNotes, intervalBetween, intervalBySemitones,
  CHORDS, ChordId, buildChord, classifyIntervals,
  diatonicChords, romanNumeral,
} from './index';

const names = (tonic: string, scale: ScaleId) =>
  buildScale(parseNote(tonic), scale).map((n) => formatNote(n));
const chordNames = (tonic: string, scale: ScaleId, size: 3 | 4 = 3) =>
  diatonicChords(parseNote(tonic), scale, size).map((c) => c.name);
const romans = (tonic: string, scale: ScaleId, size: 3 | 4 = 3) =>
  diatonicChords(parseNote(tonic), scale, size).map((c) => c.roman);

describe('notes: pitch vs spelling', () => {
  it('parses and formats note names', () => {
    for (const s of ['C', 'F#', 'Bb', 'G##', 'Ebb']) expect(formatNote(parseNote(s))).toBe(s);
    expect(parseNote('F♯')).toEqual({ letter: 'F', accidental: 1 });
    expect(formatNote(parseNote('Bb'), 'unicode')).toBe('B♭');
    expect(() => parseNote('H')).toThrow();
  });
  it('computes pitch classes across enharmonic spellings', () => {
    expect(pitchClass(parseNote('B#'))).toBe(0);
    expect(pitchClass(parseNote('Cb'))).toBe(11);
    expect(pitchClass(parseNote('A#'))).toBe(pitchClass(parseNote('Bb')));
  });
  it('converts to MIDI following the letter\'s octave', () => {
    expect(toMidi(parseNote('C'), 4)).toBe(60);
    expect(toMidi(parseNote('A'), 4)).toBe(69);
    expect(toMidi(parseNote('B#'), 3)).toBe(60);
    expect(toMidi(parseNote('Cb'), 4)).toBe(59);
  });
  it('converts MIDI to frequency (equal temperament)', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3);
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
    expect(midiToFrequency(69, 442)).toBeCloseTo(442, 6);
  });
  it('spells a pitch class using a required letter', () => {
    expect(formatNote(spellNote('F', 6))).toBe('F#');
    expect(formatNote(spellNote('G', 6))).toBe('Gb');
    expect(formatNote(spellNote('C', 11))).toBe('Cb');
  });
});

describe('scales', () => {
  it('builds C major, A natural minor, A harmonic minor', () => {
    expect(names('C', 'major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(names('A', 'natural-minor')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(names('A', 'harmonic-minor')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G#']);
  });
  it('spells sharp and flat keys correctly', () => {
    expect(names('F#', 'major')).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
    expect(names('Db', 'major')).toEqual(['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']);
    expect(names('Eb', 'natural-minor')).toEqual(['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db']);
  });
  it('uses a double sharp for the raised 7th when needed (G# harmonic minor)', () => {
    expect(names('G#', 'harmonic-minor')).toEqual(['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F##']);
  });
  it('uses each letter name exactly once in every key (all 12 tonics, all scales)', () => {
    for (const [scaleId, keys] of [['major', MAJOR_KEYS], ['natural-minor', MINOR_KEYS], ['harmonic-minor', MINOR_KEYS]] as const) {
      for (const key of keys) {
        const letters = buildScale(parseNote(key), scaleId).map((n) => n.letter);
        expect(new Set(letters).size, `${key} ${scaleId}`).toBe(7);
      }
    }
  });
  it('has 12 keys for major and minor', () => {
    expect(MAJOR_KEYS).toHaveLength(12);
    expect(MINOR_KEYS).toHaveLength(12);
  });
  it('harmonic minor differs from natural minor ONLY by the raised 7th', () => {
    const nat = SCALES['natural-minor'].semitonePattern;
    const har = SCALES['harmonic-minor'].semitonePattern;
    nat.forEach((v, i) => expect(har[i]).toBe(i === 6 ? v + 1 : v));
  });
  it('maps scale degrees to MIDI notes', () => {
    expect(degreeToMidi(60, 'major', 1)).toBe(60);
    expect(degreeToMidi(60, 'major', 5)).toBe(67);
    expect(degreeToMidi(60, 'major', 7)).toBe(71);
    expect(degreeToMidi(60, 'major', 8)).toBe(72);
    expect(degreeToMidi(60, 'natural-minor', 7)).toBe(70); // flat 7
    expect(degreeToMidi(60, 'harmonic-minor', 7)).toBe(71); // raised 7 = leading tone
    expect(() => degreeToMidi(60, 'major', 0)).toThrow();
  });
  it('every scale pattern starts at 0 and strictly ascends within an octave', () => {
    for (const s of Object.values(SCALES)) {
      expect(s.semitonePattern[0]).toBe(0);
      s.semitonePattern.forEach((v, i) => {
        expect(v).toBeLessThan(12);
        if (i > 0) expect(v).toBeGreaterThan(s.semitonePattern[i - 1] as number);
      });
      expect(s.degreeLabels).toHaveLength(s.semitonePattern.length);
    }
  });
});

describe('intervals', () => {
  it('defines 13 intervals, one per semitone count 0–12', () => {
    expect(INTERVALS.map((i) => i.semitones)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(intervalBySemitones(6).short).toBe('TT');
    expect(intervalBySemitones(11).short).toBe('M7');
    expect(() => intervalBySemitones(13)).toThrow();
  });
  it('generates ascending, descending and harmonic playback', () => {
    expect(intervalNotes(60, 7, 'ascending')).toEqual({ notes: [60, 67], simultaneous: false });
    expect(intervalNotes(60, 7, 'descending')).toEqual({ notes: [60, 53], simultaneous: false });
    expect(intervalNotes(60, 7, 'harmonic')).toEqual({ notes: [60, 67], simultaneous: true });
  });
  it('round-trips: measuring the generated notes gives back the interval', () => {
    for (const { semitones } of INTERVALS) {
      for (const dir of ['ascending', 'descending'] as const) {
        const { notes } = intervalNotes(64, semitones, dir);
        const measured = intervalBetween(notes[0] as number, notes[1] as number);
        expect(measured.semitones).toBe(semitones);
        if (semitones > 0) expect(measured.direction).toBe(dir);
      }
    }
    expect(intervalBetween(60, 60).direction).toBe('unison');
  });
});

describe('chords', () => {
  it('builds triads in root position', () => {
    expect(buildChord(60, 'major')).toEqual([60, 64, 67]);
    expect(buildChord(60, 'minor')).toEqual([60, 63, 67]);
    expect(buildChord(60, 'diminished')).toEqual([60, 63, 66]);
    expect(buildChord(60, 'augmented')).toEqual([60, 64, 68]);
  });
  it('builds seventh chords', () => {
    expect(buildChord(60, 'maj7')).toEqual([60, 64, 67, 71]);
    expect(buildChord(60, 'dom7')).toEqual([60, 64, 67, 70]);
    expect(buildChord(60, 'min7')).toEqual([60, 63, 67, 70]);
    expect(buildChord(60, 'min7b5')).toEqual([60, 63, 66, 70]);
    expect(buildChord(60, 'dim7')).toEqual([60, 63, 66, 69]);
    expect(buildChord(60, 'minMaj7')).toEqual([60, 63, 67, 71]);
  });
  it('builds inversions', () => {
    expect(buildChord(60, 'major', 1)).toEqual([64, 67, 72]);
    expect(buildChord(60, 'major', 2)).toEqual([67, 72, 76]);
    expect(buildChord(60, 'maj7', 3)).toEqual([71, 72, 76, 79]);
    expect(() => buildChord(60, 'major', 3)).toThrow();
    expect(() => buildChord(60, 'major', -1)).toThrow();
  });
  it('inversions keep the same pitch classes', () => {
    for (const id of Object.keys(CHORDS) as ChordId[]) {
      const size = CHORDS[id].intervalsFromRoot.length;
      const base = [...new Set(buildChord(60, id).map((n) => n % 12))].sort();
      for (let inv = 1; inv < size; inv++) {
        expect([...new Set(buildChord(60, id, inv).map((n) => n % 12))].sort()).toEqual(base);
      }
    }
  });
  it('classifies interval structures', () => {
    expect(classifyIntervals([0, 4, 7])).toBe('major');
    expect(classifyIntervals([0, 3, 6, 10])).toBe('min7b5');
    expect(classifyIntervals([0, 2, 7])).toBeNull();
  });
  it('every chord definition starts at 0 and ascends', () => {
    for (const c of Object.values(CHORDS)) {
      expect(c.intervalsFromRoot[0]).toBe(0);
      c.intervalsFromRoot.forEach((v, i) => {
        if (i > 0) expect(v).toBeGreaterThan(c.intervalsFromRoot[i - 1] as number);
      });
    }
  });
});

describe('diatonic harmony', () => {
  it('C major triads: C, Dm, Em, F, G, Am, Bdim  (spec acceptance criterion)', () => {
    expect(chordNames('C', 'major')).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
    expect(romans('C', 'major')).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  });
  it('C major sevenths', () => {
    expect(chordNames('C', 'major', 4)).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
    expect(romans('C', 'major', 4)).toEqual(['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
  });
  it('C natural minor triads', () => {
    expect(chordNames('C', 'natural-minor')).toEqual(['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb']);
    expect(romans('C', 'natural-minor')).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  });
  it('C harmonic minor triads: raised 7th makes V major, III augmented, vii° diminished', () => {
    expect(chordNames('C', 'harmonic-minor')).toEqual(['Cm', 'Ddim', 'Ebaug', 'Fm', 'G', 'Ab', 'Bdim']);
    expect(romans('C', 'harmonic-minor')).toEqual(['i', 'ii°', 'III+', 'iv', 'V', 'VI', 'vii°']);
  });
  it('C harmonic minor sevenths', () => {
    expect(chordNames('C', 'harmonic-minor', 4)).toEqual(['Cm(maj7)', 'Dm7b5', 'Ebmaj7#5', 'Fm7', 'G7', 'Abmaj7', 'Bdim7']);
  });
  it('spells chords correctly in awkward keys', () => {
    expect(chordNames('F#', 'major')).toEqual(['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim']);
    expect(chordNames('Db', 'major')).toEqual(['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim']);
  });
  it('chord tones are spelled from the scale (E# dim in F# major = E# G# B)', () => {
    const vii = diatonicChords(parseNote('F#'), 'major')[6]!;
    expect(vii.notes.map((n) => formatNote(n))).toEqual(['E#', 'G#', 'B']);
  });
  it('the same quality pattern holds in all 12 keys', () => {
    const patterns: Record<string, ChordId[]> = {
      major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
      'natural-minor': ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
      'harmonic-minor': ['minor', 'diminished', 'augmented', 'minor', 'major', 'major', 'diminished'],
    };
    for (const [scaleId, keys] of [['major', MAJOR_KEYS], ['natural-minor', MINOR_KEYS], ['harmonic-minor', MINOR_KEYS]] as const) {
      for (const key of keys) {
        const ids = diatonicChords(parseNote(key), scaleId).map((c) => c.chordId);
        expect(ids, `${key} ${scaleId}`).toEqual(patterns[scaleId]);
      }
    }
  });
  it('roman numeral casing follows the chord\'s third', () => {
    expect(romanNumeral(5, 'dom7')).toBe('V7');
    expect(romanNumeral(2, 'min7')).toBe('ii7');
    expect(romanNumeral(7, 'dim7')).toBe('vii°7');
    expect(() => romanNumeral(8, 'major')).toThrow();
  });
});
