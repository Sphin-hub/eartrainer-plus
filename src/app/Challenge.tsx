import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { engine } from '../audio/audioEngine';
import type { LevelConfig } from '../content/paths';
import { generateSet, newSession, submitAnswer, summarize, timeoutQuestion, type ChallengeQuestion } from '../engine/challenge';
import { makeRng } from '../engine/generator';

type Summary = ReturnType<typeof summarize>;
interface Props {
  level: LevelConfig; mode: 'practice' | 'challenge'; timed: boolean; keyChoice: string; preset?: ChallengeQuestion[];
  onAnswer: (concept: string, correct: boolean) => void;
  onFinish: (s: Summary) => void; onAgain: () => void; onPracticeMissed: (qs: ChallengeQuestion[]) => void; onExit: () => void;
}

/** The game-style screen: pause, score, timer, speaker, combo, big answer buttons. */
export function Challenge({ level, mode, timed, keyChoice, preset, onAnswer, onFinish, onAgain, onPracticeMissed, onExit }: Props) {
  const [qs] = useState(() => preset?.map((x) => ({ ...x, status: 'awaiting_answer' as const })) ?? generateSet(level, makeRng(Date.now()), keyChoice));
  const session = useRef(newSession());
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'asking' | 'feedback' | 'done'>('asking');
  const [picked, setPicked] = useState<string | null>(null);
  const [left, setLeft] = useState(level.seconds);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const token = useRef(0);
  const q = qs[i]!;
  const s = session.current;

  const hear = useCallback(async () => {
    const mine = ++token.current;
    try {
      setAudioError(false); setPlaying(true);
      const seconds = await engine.play(q.events);
      window.setTimeout(() => { if (mine === token.current) setPlaying(false); }, seconds * 1000 + 300);
    } catch {
      setPlaying(false); setAudioError(true); // not scored: the player can retry
    }
  }, [q]);

  // Audio starts only once the question and its answer key exist (they're generated up front).
  useEffect(() => { if (phase === 'asking' && !paused) void hear(); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer: runs only while the player can answer (after the audio ends, not paused).
  useEffect(() => {
    if (!timed || phase !== 'asking' || paused || playing || audioError) return;
    const id = window.setInterval(() => setLeft((t) => t - 0.1), 100);
    return () => window.clearInterval(id);
  }, [timed, phase, paused, playing, audioError, i]);
  useEffect(() => {
    if (timed && phase === 'asking' && left <= 0 && timeoutQuestion(q, s)) { setPhase('feedback'); bump(); }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const last = s.answers[s.answers.length - 1];
  const go = useCallback(() => {
    if (i + 1 >= qs.length) {
      setPhase('done');
      if (mode === 'challenge') onFinish(summarize(s, qs.length, level.mastery));
    } else { setI(i + 1); setPicked(null); setPhase('asking'); setLeft(level.seconds); }
  }, [i, qs.length, mode, level, onFinish, s]);
  // Correct answers move on by themselves; a miss waits so you can read the answer and replay it.
  useEffect(() => {
    if (phase !== 'feedback' || !last?.correct) return;
    const id = window.setTimeout(go, 900);
    return () => window.clearTimeout(id);
  }, [phase, i]); // eslint-disable-line react-hooks/exhaustive-deps

  function answer(id: string) {
    const r = submitAnswer(q, id, s);
    if (!r.accepted) return;
    setPicked(id); setPhase('feedback'); bump();
    if (mode === 'challenge') onAnswer(q.concept, r.isCorrect);
  }
  function togglePause() {
    const next = !paused;
    s.isPaused = next; setPaused(next);
    if (next) engine.stop(); else if (phase === 'asking') void hear();
  }

  if (phase === 'done') {
    const r = summarize(s, qs.length, level.mastery);
    const missed = qs.filter((x) => s.answers.some((a) => a.questionId === x.id && !a.correct));
    return (
      <main className="results">
        <section className="panel">
          <h2>{mode === 'practice' ? 'Practice complete' : r.passed ? '✓ Level passed' : '✗ Not passed yet'}</h2>
          <p className="big mono">{r.correct}/{r.total} · {Math.round(r.accuracy * 100)}%</p>
          <p className="hint">Correct {r.correct} · Wrong {r.incorrect} · Unanswered {r.unanswered} · Longest combo {r.bestCombo}</p>
          {mode === 'challenge' && <p className="hint">Needed {Math.round(level.mastery * 100)}% to pass.</p>}
          {r.revise.length > 0 && <p><b>Revise:</b> {r.revise.slice(0, 4).join(', ')}</p>}
        </section>
        {missed.length > 0 && (
          <section className="panel">
            <h3>Mistakes</h3>
            {missed.map((x) => <p key={x.id} className="miss">✗ {x.concept}: answer was <b>{x.options.find((o) => o.id === x.correctOptionId)!.label}</b> ({x.reveal})</p>)}
          </section>
        )}
        <div className="two">
          <button className="ghost" onClick={onExit}>Back</button>
          <button className="go" onClick={onAgain}>Try again</button>
        </div>
        {missed.length > 0 && <button className="ghost" onClick={() => onPracticeMissed(missed)}>Practise missed questions</button>}
      </main>
    );
  }

  const answered = phase === 'feedback';
  const correctLabel = q.options.find((o) => o.id === q.correctOptionId)!.label;
  return (
    <main className="game">
      <div className="hud">
        <button className="icon" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>{paused ? '▶' : '⏸'}</button>
        <div className="score"><small>{mode === 'practice' ? 'PRACTICE' : 'SCORE'} · {i + 1}/{qs.length}</small><b className="mono">{s.score}</b></div>
        <div className="timer mono" aria-label="Time left">{timed ? `${Math.max(0, Math.ceil(left))}s` : '∞'}</div>
      </div>
      <div className="vu" aria-hidden>{qs.map((x, k) => <i key={x.id} className={k < i || (k === i && answered) ? 'hit' : ''} />)}</div>

      <button className={`speaker ${playing ? 'playing' : ''}`} onClick={() => void hear()} disabled={paused} aria-label="Replay sound">
        <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden><path d="M8 24h12l16-12v40L20 40H8z" fill="currentColor" /><path className="w1" d="M44 22a14 14 0 0 1 0 20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /><path className="w2" d="M51 14a24 24 0 0 1 0 36" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
      </button>
      {audioError && <button className="go" onClick={() => void hear()}>Audio failed. Tap to retry (not scored)</button>}
      <div className="row"><p className="prompt">{paused ? 'Paused' : q.prompt}</p><span className="pill amber">🔥 ×{s.combo}</span></div>
      {mode === 'practice' && !answered && <p className="keyline">Key: <b>{q.keyLabel}</b></p>}

      <div className="feedback" role="status" aria-live="polite">
        {answered && (last?.correct ? <><b className="ok">✓ Correct</b> <span className="reveal">{q.reveal}</span></>
          : <><b className="no">{last?.status === 'timeout' ? '⏱ Time’s up' : '✗ Not quite'}</b> Answer: <b>{correctLabel}</b> <span className="reveal">It was {q.reveal}</span> <button className="ghost" onClick={go}>{i + 1 >= qs.length ? 'See results' : 'Next'}</button></>)}
      </div>

      <div className={`answers c${level.choices}`}>
        {paused ? <button className="go wide" onClick={togglePause}>Resume</button> : q.options.map((o) => {
          const state = !answered ? '' : o.id === q.correctOptionId ? 'correct' : o.id === picked ? 'wrong' : 'dim';
          return <button key={o.id} className={`ans ${state}`} disabled={answered} onClick={() => answer(o.id)}>
            {state === 'correct' && '✓ '}{state === 'wrong' && '✗ '}{o.label}
          </button>;
        })}
      </div>
      <button className="link" onClick={onExit}>Quit</button>
    </main>
  );
}
