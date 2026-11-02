import { useState } from 'react';
import { type ChallengeQuestion } from '../engine/challenge';
import { finishLevel, loadProgress, record, setKeyChoice, type Progress } from '../engine/progress';
import { type LevelConfig, type PathConfig } from '../content/paths';
import { Challenge } from './Challenge';
import { Instruments } from './Instruments';
import { Scales } from './Scales';
import { LevelScreen, Library, ProgressView } from './Library';

type Tab = 'learn' | 'scales' | 'instruments' | 'progress';
const ICON: Record<Tab, string> = { learn: '♪', scales: '♬', instruments: '🎸', progress: '▮' };
const LABEL: Record<Tab, string> = { learn: 'Learn', scales: 'Scales', instruments: 'Instruments', progress: 'Progress' };

interface Run { path: PathConfig; level: LevelConfig; mode: 'practice' | 'challenge'; timed: boolean; keyChoice: string; preset?: ChallengeQuestion[]; key: number }

export function App() {
  const [tab, setTab] = useState<Tab>('learn');
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [open, setOpen] = useState<{ path: PathConfig; level: LevelConfig } | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const keyChoice = progress.settings?.key ?? 'random';

  if (run) {
    const key = `${run.path.id}:${run.level.id}`;
    return (
      <div className="app">
        <Challenge
          key={run.key} level={run.level} mode={run.mode} timed={run.timed} keyChoice={run.keyChoice} preset={run.preset}
          onAnswer={(concept, ok) => setProgress((p) => record(p, concept, ok))}
          onFinish={(s) => setProgress((p) => finishLevel(p, key, s.accuracy, s.passed, s.bestCombo))}
          onAgain={() => setRun({ ...run, preset: undefined, key: run.key + 1 })}
          onPracticeMissed={(preset) => setRun({ ...run, mode: 'practice', timed: false, preset, key: run.key + 1 })}
          onExit={() => setRun(null)}
        />
      </div>
    );
  }
  return (
    <div className="app">
      <header className="top">
        <div className="brand">HARMONIC<small>{open ? open.path.title.toUpperCase() : tab.toUpperCase()}</small></div>
        <span className="pill amber" title="Days practised in a row">🔥 {progress.dayStreak}D</span>
        <span className="pill cyan" title="Experience points">⚡ {progress.xp.toLocaleString()}</span>
      </header>
      <main>
        {tab === 'scales' ? (
          <Scales onTrain={(path, level) => { setTab('learn'); setOpen({ path, level }); }} />
        ) : tab === 'instruments' ? (
          <Instruments />
        ) : tab === 'progress' ? (
          <ProgressView progress={progress} />
        ) : open ? (
          <LevelScreen
            {...open} keyChoice={keyChoice} onKey={(k) => setProgress((p) => setKeyChoice(p, k))} onBack={() => setOpen(null)}
            onStart={(mode, timed) => setRun({ ...open, mode, timed, keyChoice, key: Date.now() })}
          />
        ) : (
          <Library progress={progress} onOpen={(path, level) => setOpen({ path, level })} />
        )}
      </main>
      <nav className="dock" aria-label="Main">
        {(['learn', 'scales', 'instruments', 'progress'] as const).map((t) => (
          <button key={t} className={t === tab ? 'on' : ''} onClick={() => { setTab(t); setOpen(null); }} aria-current={t === tab}>
            <span aria-hidden>{ICON[t]}</span>{LABEL[t]}
          </button>
        ))}
      </nav>
    </div>
  );
}
