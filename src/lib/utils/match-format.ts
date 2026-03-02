/**
 * Shared utilities for match label formatting and sorting.
 * Used by TBA match history table, performance trend chart, and other
 * components that display match-level data.
 */

const COMP_LEVEL_ORDER: Record<string, number> = {
  qm: 0,
  ef: 1,
  qf: 2,
  sf: 3,
  f: 4,
};

interface MatchSortable {
  compLevel: string;
  setNumber: number;
  matchNumber: number;
}

/**
 * Format a match label from its comp level, match number, and set number.
 * Examples: "Q12", "QF1-2", "SF2-1", "F1-3"
 */
export function formatMatchLabel(
  compLevel: string,
  matchNumber: number,
  setNumber: number
): string {
  switch (compLevel) {
    case 'qm':
      return `Q${matchNumber}`;
    case 'ef':
      return `E${setNumber}-${matchNumber}`;
    case 'qf':
      return `QF${setNumber}-${matchNumber}`;
    case 'sf':
      return `SF${setNumber}-${matchNumber}`;
    case 'f':
      return `F${setNumber}-${matchNumber}`;
    default:
      return `${compLevel}${matchNumber}`;
  }
}

/**
 * Sort matches by comp level, then set number, then match number.
 * Returns a new sorted array (does not mutate the input).
 */
export function sortMatchesBySchedule<T extends MatchSortable>(matches: T[]): T[] {
  return [...matches].sort((a, b) => {
    const levelDiff =
      (COMP_LEVEL_ORDER[a.compLevel] ?? 99) - (COMP_LEVEL_ORDER[b.compLevel] ?? 99);
    if (levelDiff !== 0) return levelDiff;
    const setDiff = (a.setNumber ?? 1) - (b.setNumber ?? 1);
    if (setDiff !== 0) return setDiff;
    return a.matchNumber - b.matchNumber;
  });
}
