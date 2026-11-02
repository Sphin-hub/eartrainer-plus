import { useState } from 'react';
import { engine } from '../audio/audioEngine';
import { MAJOR_KEYS, formatNote, parseNote } from '../theory';
import { PATHS, learnItems, type LevelConfig, type PathConfig } from '../content/paths';
import { isUnlocked } from '../engine/challenge';
import type { Progress } from '../engine/progress';

/** Learn tab: every path with its levels, mastery and locks. */
export function Library({ progress, onOpen }: { progress: Progress; onOpen: (p: PathConfig, l: LevelConfig) => void }) {
  return (
    <>
      {PATHS.map((path) => (
        <section className="panel" key={path.id}>
          <h2>{path.title}</h2>
          <p className="hint">{path.blurb}</p>
          {path.levels.map((level, i) => {
            const open = isUnlocked(progress, path, i);
            const m = progress.mastery[`${path.id}:${level.id}`];
            return (
              <button key={level.id} className="lvl" disabled={!open} onClick={() => onOpen(path, level)}>
                <span aria-hidden>{!open ? '🔒' : m?.passed ? '✓' : '○'}</span>
                <b>{level.title}</b>
                <span className="mono">{!open ? 'Pass the previous level' : m ? `${m.passed ? 'Passed' : 'Best'} ${Math.round(m.best * 100)}%` : 'New'}</span>
              </button>
            );
          })}
        </section>
      ))}
    </>
  );
}

/** One level: the pass rule, a Learn list you can listen to, then Practise or Challenge. */
export function LevelScreen({ path, level, keyChoice, onKey, onBack, onStart }: {
  path: PathConfig; level: LevelConfig; keyChoice: string; onKey: (k: string) => void; onBack: () => void; onStart: (mode: 'practice' | 'challenge', timed: boolean) => void;
}) {
  const [timed, setTimed] = useState(true);
  const start = (mode: 'practice' | 'challenge') => { void engine.unlock(); onStart(mode, mode === 'challenge' && timed); };
  return (
    <>
      <button className="link" onClick={onBack}>← {path.title}</button>
      <section className="panel">
        <h2>{level.title}</h2>
        <p className="hint">Pass: {Math.round(level.mastery * 100)}% of {level.questions} questions · {level.choices} choices</p>
        <h3 className="lbl">LEARN</h3>
        {learnItems(level).map((item) => (
          <button key={item.title} className="learn" onClick={() => void engine.play(item.events)}>
            <span aria-hidden>▶</span><b>{item.title}</b><small>{item.sub}</small>
          </button>
        ))}
      </section>
      <section className="panel">
        <label className="lbl">Key
          <select value={keyChoice} onChange={(e) => onKey(e.target.value)} aria-label="Key">
            <option value="random">Random each question</option>
            {MAJOR_KEYS.map((k) => <option key={k} value={k}>{formatNote(parseNote(k), 'unicode')}</option>)}
          </select>
        </label>
        <label className="lbl"><input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} /> Timed challenge ({level.seconds}s per question)</label>
        <div className="two">
          <button className="ghost" onClick={() => start('practice')}><b>Practise</b><small>No timer, not scored</small></button>
          <button className="go" onClick={() => start('challenge')}><b>Challenge</b><small>Counts toward mastery</small></button>
        </div>
      </section>
    </>
  );
}

/** Progress tab: weak concepts first, then level records. */
export function ProgressView({ progress }: { progress: Progress }) {
  const weak = Object.entries(progress.stats)
    .map(([concept, s]) => ({ concept, acc: s.right / s.total, total: s.total }))
    .filter((x) => x.total >= 2 && x.acc < 0.85)
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 6);
  const records = PATHS.flatMap((p) => p.levels.map((l) => ({ name: `${p.title} · ${l.title}`, m: progress.mastery[`${p.id}:${l.id}`] }))).filter((r) => r.m);
  return (
    <>
      <section className="panel">
        <h2>Revise next</h2>
        {weak.length ? weak.map((w) => <div className="row" key={w.concept}><span>{w.concept}</span><span className="mono">{Math.round(w.acc * 100)}% of {w.total}</span></div>)
          : <p className="hint">Nothing to revise yet. Finish a challenge and your weak spots appear here.</p>}
      </section>
      <section className="panel">
        <h2>Level records</h2>
        {records.length ? records.map((r) => <div className="row" key={r.name}><span>{r.m!.passed ? '✓' : '○'} {r.name}</span><span className="mono">{Math.round(r.m!.best * 100)}% · combo {r.m!.bestCombo}</span></div>)
          : <p className="hint">No challenges completed yet.</p>}
      </section>
    </>
  );
}
