/** progressions.ts — named progressions per scale, as scale-degree sequences. Add more here; nothing else changes. */
import { diatonicChords, parseNote, type ScaleId } from '../theory';

export interface ProgressionDef { id: string; scale: ScaleId; degrees: number[]; size?: 3 | 4; note: string }
const P = (scale: ScaleId, degrees: number[], note: string, size?: 3 | 4): ProgressionDef =>
  ({ id: `${scale}:${degrees.join('')}${size === 4 ? '7' : ''}`, scale, degrees, size, note });

export const PROGRESSIONS: ProgressionDef[] = [
  P('major', [1, 4, 5, 1], 'Classic cadence'), P('major', [1, 5, 6, 4], 'Modern pop'), P('major', [1, 6, 4, 5], '50s doo-wop'),
  P('major', [1, 4, 6, 5], 'Rising pop'), P('major', [6, 4, 1, 5], 'Pop, minor start'), P('major', [1, 3, 4, 5], 'Stepwise rise'),
  P('major', [2, 5, 1, 6], 'ii–V–I turnaround'), P('major', [4, 5, 3, 6], 'Royal road'),
  P('major', [2, 5, 1, 4], 'Jazz ii–V–I', 4), P('major', [1, 6, 2, 5], 'Jazz turnaround', 4), P('major', [3, 6, 2, 5], 'Jazz circle', 4), P('major', [2, 5, 1, 6], 'Jazz ii–V–I–vi', 4),
  P('natural-minor', [1, 4, 5, 1], 'Minor cadence'), P('natural-minor', [1, 6, 3, 7], 'Epic minor'), P('natural-minor', [1, 7, 6, 7], 'Rock minor'),
  P('natural-minor', [1, 4, 7, 3], 'Descending fifths'), P('natural-minor', [1, 6, 4, 5], 'Minor ballad'), P('natural-minor', [1, 3, 7, 6], 'Minor climb'),
  P('harmonic-minor', [1, 4, 5, 1], 'Strong cadence'), P('harmonic-minor', [1, 6, 5, 1], 'Dramatic'), P('harmonic-minor', [1, 2, 5, 1], 'ii°–V–i'),
  P('harmonic-minor', [1, 4, 2, 5], 'Classical'), P('harmonic-minor', [1, 6, 2, 5], 'Classical turnaround'),
  P('melodic-minor', [1, 4, 5, 1], 'Bright minor'), P('melodic-minor', [1, 2, 5, 1], 'Jazz minor'), P('melodic-minor', [1, 4, 2, 5], 'Jazz minor lift'),
  P('melodic-minor', [1, 5, 4, 1], 'Open minor'), P('melodic-minor', [1, 4, 5, 1], 'Jazz minor sevenths', 4),
];

/** Roman numerals of a progression, e.g. "I – V – vi – IV". */
export function romanLabel(p: ProgressionDef): string {
  const chords = diatonicChords(parseNote('C'), p.scale, p.size ?? 3);
  return p.degrees.map((d) => chords[d - 1]!.roman).join(' – ');
}
