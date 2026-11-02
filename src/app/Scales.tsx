import { useState } from 'react';
import { engine } from '../audio/audioEngine';
import { chordEvents, progressionEvents, scaleEvents, type NoteEvent } from '../audio/events';
import { PATHS, type LevelConfig, type PathConfig } from '../content/paths';
import { MAJOR_KEYS, SCALES, buildScale, chordLabel, diatonicChords, formatNote, parseNote, toMidi, type ScaleId } from '../theory';

type Target = [pathId: string, levelIndex: number];
const TRAIN: Record<ScaleId, { notes: Target; chords: Target; progs: Target }> = {
  major: { notes: ['major-notes', 1], chords: ['major-harmony', 2], progs: ['major-progressions', 1] },
  'natural-minor': { notes: ['minor-notes', 0], chords: ['minor-harmony', 0], progs: ['minor-progressions', 0] },
  'harmonic-minor': { notes: ['minor-notes', 1], chords: ['minor-harmony', 1], progs: ['minor-progressions', 1] },
  'melodic-minor': { notes: ['minor-notes', 2], chords: ['minor-harmony', 2], progs: ['minor-progressions', 2] },
};
const fmt = (n: Parameters<typeof formatNote>[0]) => formatNote(n, 'unicode');
const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK: [number, number][] = [[1, 9], [3, 21], [6, 45], [8, 57], [10, 69]];

/** Tiny one-octave keyboard (in C) with the scale's notes lit: the scale's icon. */
function ScaleIcon({ id }: { id: ScaleId }) {
  const on = new Set(SCALES[id].semitonePattern);
  return (
    <svg viewBox="0 0 84 40" width="84" height="40" role="img" aria-label={`${SCALES[id].name} notes`}>
      {WHITE.map((pc, i) => <rect key={pc} x={i * 12 + 0.5} y="0.5" width="11" height="39" rx="1.5" fill={on.has(pc) ? '#00d2ff' : '#e2e8f0'} stroke="#475569" />)}
      {BLACK.map(([pc, x]) => <rect key={pc} x={x} y="0.5" width="6" height="24" rx="1" fill={on.has(pc) ? '#0f6f85' : '#181f2c'} stroke={on.has(pc) ? '#00d2ff' : '#334155'} />)}
    </svg>
  );
}

/** Scales tab: each scale with its icon, notes and chords, plus shortcuts into training. */
export function Scales({ onTrain }: { onTrain: (p: PathConfig, l: LevelConfig) => void }) {
  const [key, setKey] = useState('C');
  const [sevenths, setSevenths] = useState(false);
  const root = parseNote(key);
  const size = sevenths ? 4 : 3;
  const play = (events: NoteEvent[]) => void engine.play(events);
  const go = ([pathId, i]: Target) => { const p = PATHS.find((x) => x.id === pathId)!; onTrain(p, p.levels[i]!); };
  return (
    <>
      <section className="panel">
        <h2>Scales</h2>
        <p className="hint">Hear each scale and the chords it makes, then train your ear on its notes, chords and progressions.</p>
        <div className="row">
          <select value={key} onChange={(e) => setKey(e.target.value)} aria-label="Key">{MAJOR_KEYS.map((k) => <option key={k} value={k}>Key {fmt(parseNote(k))}</option>)}</select>
          <label className="lbl"><input type="checkbox" checked={sevenths} onChange={(e) => setSevenths(e.target.checked)} /> Seventh chords</label>
        </div>
      </section>
      {(Object.keys(SCALES) as ScaleId[]).map((id) => (
        <section className="panel" key={id}>
          <div className="row scalehead">
            <ScaleIcon id={id} />
            <div><h3>{SCALES[id].name}</h3><p className="hint mono">{buildScale(root, id).map(fmt).join(' ')}</p></div>
          </div>
          <div className="chips">
            {diatonicChords(root, id, size).map((c) => (
              <button key={c.degree} className="chip" onClick={() => play(chordEvents(toMidi(c.root, 3), c.chordId))}>
                <small className="mono">{c.roman}</small>{chordLabel(c.root, c.chordId)}
              </button>
            ))}
          </div>
          <div className="two">
            <button className="ghost" onClick={() => play(scaleEvents(toMidi(root, 3), id, 'both'))}>▶ Scale up and down</button>
            <button className="ghost" onClick={() => play(progressionEvents(root, toMidi(root, 3), id, [1, 2, 3, 4, 5, 6, 7, 1], 0.8, size))}>▶ Chords in order</button>
          </div>
          <div className="three">
            <button className="go" onClick={() => go(TRAIN[id].notes)}>Train notes</button>
            <button className="go" onClick={() => go(TRAIN[id].chords)}>Train chords</button>
            <button className="go" onClick={() => go(TRAIN[id].progs)}>Train progressions</button>
          </div>
        </section>
      ))}
    </>
  );
}
