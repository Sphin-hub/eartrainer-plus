/** main.ts — wires the Sound Lab page to the theory engine and the audio engine. */
import { AudioEngine } from './audio/audioEngine';
import { chordEvents, intervalEvents, scaleEvents, type NoteEvent } from './audio/events';
import {
  CHORDS, INTERVALS, SCALES, buildScale, formatNote, keysFor, parseNote, spellChord, toMidi,
  type ChordId, type Direction, type ScaleId,
} from './theory';

const engine = new AudioEngine();
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const keySel = $<HTMLSelectElement>('key');
const scaleSel = $<HTMLSelectElement>('scale');
const readout = $('readout');

const fmt = (n: Parameters<typeof formatNote>[0]) => formatNote(n, 'unicode');
const tonic = () => parseNote(keySel.value);
const tonicMidi = () => toMidi(tonic(), 4);
const scaleId = () => scaleSel.value as ScaleId;

function play(events: NoteEvent[], text: string): void {
  readout.textContent = text;
  void engine.play(events);
}

// --- Key and scale pickers (the key list depends on major vs minor) ---
for (const s of Object.values(SCALES)) scaleSel.add(new Option(s.name, s.id));
function fillKeys(): void {
  const previous = keySel.value;
  keySel.replaceChildren(...keysFor(scaleId()).map((k) => new Option(fmt(parseNote(k)), k)));
  if (keysFor(scaleId()).includes(previous)) keySel.value = previous;
}
scaleSel.addEventListener('change', fillKeys);
fillKeys();

$<HTMLInputElement>('volume').addEventListener('input', (e) => engine.setVolume(Number((e.target as HTMLInputElement).value)));
$('stop').addEventListener('click', () => engine.stop());

// --- Scale buttons ---
document.querySelectorAll<HTMLButtonElement>('[data-scale]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const dir = btn.dataset.scale as 'ascending' | 'descending' | 'both';
    const notes = [...buildScale(tonic(), scaleId()), tonic()].map(fmt);
    const shown = dir === 'descending' ? [...notes].reverse() : dir === 'both' ? [...notes, ...[...notes].reverse().slice(1)] : notes;
    play(scaleEvents(tonicMidi(), scaleId(), dir), `${fmt(tonic())} ${SCALES[scaleId()].name}: ${shown.join(' ')}`);
  }),
);

// --- Interval buttons ---
const direction = () => (document.querySelector('input[name="dir"]:checked') as HTMLInputElement).value as Direction;
$('intervals').replaceChildren(
  ...INTERVALS.map((i) => {
    const btn = document.createElement('button');
    btn.textContent = `${i.name} (${i.short})`;
    btn.addEventListener('click', () =>
      play(intervalEvents(tonicMidi(), i.semitones, direction()), `${i.name}: ${i.semitones} semitones, ${direction()}, from ${fmt(tonic())}`),
    );
    return btn;
  }),
);

// --- Chord buttons ---
$('chords').replaceChildren(
  ...Object.values(CHORDS).map((c) => {
    const btn = document.createElement('button');
    btn.textContent = c.name;
    btn.addEventListener('click', () => {
      const size = c.intervalsFromRoot.length;
      const inversion = Math.min(Number($<HTMLSelectElement>('inversion').value), size - 1);
      const style = $<HTMLSelectElement>('style').value as 'block' | 'arpeggio';
      const tones = spellChord(tonic(), c.id as ChordId).map(fmt);
      const heard = [...tones.slice(inversion), ...tones.slice(0, inversion)]; // lowest note first
      play(chordEvents(tonicMidi(), c.id as ChordId, inversion, style), `${fmt(tonic())}${c.suffix}: ${heard.join(' ')}${inversion ? ` (inversion ${inversion})` : ''}`);
    });
    return btn;
  }),
);
