import { useState } from 'react';
import { engine } from '../audio/audioEngine';
import { chordEvents } from '../audio/events';
import {
  CHORDS, FRETTED, MAJOR_KEYS, PC_NAMES, chordLabel, chordToneMap, formatNote, parseNote, pitchClass, spellChord, toMidi,
  type ChordId, type InstrumentId,
} from '../theory';

const fmt = (n: Parameters<typeof formatNote>[0]) => formatNote(n, 'unicode');
const BLACK = [1, 3, 6, 8, 10];

/** Fundamentals: pick an instrument, a key/root and a chord to see its exact name and where its notes sit. Tap any note to hear it. */
export function Instruments() {
  const [inst, setInst] = useState<InstrumentId>('guitar');
  const [key, setKey] = useState('C');
  const [chordId, setChordId] = useState<ChordId>('major');
  const [all, setAll] = useState(false);
  const root = parseNote(key);
  const tones = spellChord(root, chordId);
  const map = chordToneMap(root, chordId);
  const rootPc = pitchClass(root);
  const octave = inst === 'piano' ? 3 : FRETTED[inst].chordOctave;
  const hear = (midi: number) => void engine.play([{ midi, start: 0, duration: 1.2, velocity: 0.8 }]);
  const label = (m: number) => { const t = map.get(m % 12); return t ? fmt(t) : all ? PC_NAMES[m % 12]! : ''; };
  const cls = (m: number) => (map.has(m % 12) ? (m % 12 === rootPc ? 'tone root' : 'tone') : '');
  const play = (style: 'block' | 'arpeggio') => { void engine.unlock(); void engine.play(chordEvents(toMidi(root, octave), chordId, 0, style)); };

  const whites: number[] = [];
  const blacks: { m: number; at: number }[] = [];
  for (let m = 48; m < 72; m++) (BLACK.includes(m % 12) ? blacks.push({ m, at: whites.length }) : whites.push(m));

  return (
    <>
      <section className="panel">
        <div className="chordhead">
          <h2 className="chordname mono">{chordLabel(root, chordId)}</h2>
          <p className="hint">{CHORDS[chordId].name} in the key of {fmt(root)} · notes: <b>{tones.map(fmt).join(' ')}</b></p>
        </div>
        <div className="row picks">
          <select value={inst} onChange={(e) => setInst(e.target.value as InstrumentId)} aria-label="Instrument">
            <option value="piano">Piano</option>
            {Object.entries(FRETTED).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}
          </select>
          <select value={key} onChange={(e) => setKey(e.target.value)} aria-label="Key or root">
            {MAJOR_KEYS.map((k) => <option key={k} value={k}>Key {fmt(parseNote(k))}</option>)}
          </select>
          <select value={chordId} onChange={(e) => setChordId(e.target.value as ChordId)} aria-label="Chord">
            {Object.values(CHORDS).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="two">
          <button className="go" onClick={() => play('block')}>Play chord</button>
          <button className="ghost" onClick={() => play('arpeggio')}>Arpeggio</button>
        </div>
      </section>

      <section className="panel">
        <div className="row"><h3 className="lbl">{inst === 'piano' ? 'PIANO · C3–B4' : `${FRETTED[inst].name.toUpperCase()} · FRETS 0–12`}</h3>
          <label className="lbl"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Label every note</label></div>
        {inst !== 'piano' && <p className="hint">Tuning: {FRETTED[inst].tuning}. Tap any fret to hear it. Cyan = chord tone, amber = root.</p>}
        {inst === 'piano' ? (
          <div className="piano" style={{ ['--w' as string]: `${100 / whites.length}%` }}>
            {whites.map((m) => <button key={m} className={`wk ${cls(m)}`} onClick={() => hear(m)} aria-label={PC_NAMES[m % 12]}>{label(m)}</button>)}
            {blacks.map((b) => <button key={b.m} className={`bk ${cls(b.m)}`} style={{ left: `calc(${b.at} * var(--w) - var(--w) * 0.3)` }} onClick={() => hear(b.m)} aria-label={PC_NAMES[b.m % 12]}>{label(b.m)}</button>)}
          </div>
        ) : (
          <div className="fretwrap">
            <div className="fb">
              {Array.from({ length: 13 }, (_, f) => <span key={f} className="fn mono">{f}</span>)}
              {[...FRETTED[inst].strings].reverse().flatMap((s) => Array.from({ length: 13 }, (_, f) => (
                <button key={`${s}-${f}`} className={`fc ${cls(s + f)}`} onClick={() => hear(s + f)} aria-label={`${PC_NAMES[(s + f) % 12]} fret ${f}`}>{label(s + f)}</button>
              )))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
