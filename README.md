# EarTrainer+

Ear-training and musicianship web app, built in phases.

## Status
- **Phase 1 (done): theory engine** — pitch/spelling, scales, intervals, chords, diatonic harmony, Roman numerals. 31 tests.
- **Phase 2 (done): audio engine + Sound Lab page** — Web Audio synth, note timelines, 40 tests total
- **Phase 3 (done): Notes trainer in the Harmonic design** — React shell, seeded generator, answer checking, cadence, XP/streaks saved locally. 46 tests
- **Phase 4 (done): learning paths + challenge phase** — config-driven paths/levels, Learn / Practise / Challenge, timer, pause, combo, results, mastery unlocks. 54 tests
- **Phase 5 (done): installable web app (PWA)** — local fonts, manifest + icons, offline service worker, deploy steps below
- **Phase 6 (done): Android project (Capacitor)** — `android/` folder, app icons, cloud APK build via GitHub Actions
- **Phase 7 (done): exact chord names + key display, key picker, Instruments tab (piano, guitar, bass, ukulele)**
- **Phase 8 (done): Scales tab, melodic minor, 27 named progressions across major and all minor types, minor chord/note paths**
- (was) Phase 3: first vertical slice — major scale-degree drill (UI + question generator + feedback + progress)
- Then: minor scales, intervals, triads, progressions, PWA, deploy

## Commands
```bash
npm install        # install dependencies
npm run dev        # app at /, Sound Lab at /sound-lab.html
npm test           # run the test suite
npm run test:watch # re-run tests on every save
npm run typecheck  # TypeScript type check
```

## Layout
```
src/theory/
  notes.ts      pitch vs spelling, MIDI, frequency
  scales.ts     scales as formulas, spelled in any key
  intervals.ts  interval table, ascending/descending/harmonic
  chords.ts     chord structures, inversions
  harmony.ts    diatonic chords + Roman numerals
  theory.test.ts
src/audio/
  events.ts       theory -> timeline of notes (pure, tested)
  audioEngine.ts  Web Audio synth + scheduling
  events.test.ts
src/main.ts       Sound Lab page wiring
index.html, src/style.css
```

## Install on your phone (PWA)
```bash
npm run build      # creates dist/ with the app, icons, manifest and offline service worker
npm run preview    # optional: try the built app locally
```
1. Upload the **contents of `dist/`** to a free static host (e.g. Netlify: drag the `dist` folder onto app.netlify.com/drop).
2. Open the https link in Chrome on your Android phone, open the menu, tap **Install app**.
3. Open it once with internet; after that it also works offline.

## Real Android APK (Capacitor)
`android/` is a ready Android Studio project wrapping the web app (app id `com.harmonic.eartrainer`).

**Without Android Studio (GitHub builds it for you):**
1. Create a free GitHub account and a new **private** repo, then upload this project (without `node_modules`/`dist`; `.gitignore` handles it if you use git).
2. Repo -> **Actions** -> **Build Android APK** -> **Run workflow**. Wait ~5-8 minutes.
3. Open the finished run, download **harmonic-ear-trainer-apk**, unzip, copy `app-debug.apk` to your phone, open it, allow "install unknown apps".

**With Android Studio:** `npm run android:sync`, then `npm run android:open`, then Build -> Build APK(s).

After changing the web code: rebuild with `npm run android:sync` (or let the workflow do it).

Note: the Android icons are already generated in `android/`. To regenerate them later, run `npx @capacitor/assets generate --android --assetPath assets` (it downloads an image tool, so it needs a good connection).
