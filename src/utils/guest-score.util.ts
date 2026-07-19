/**
 * Thresholds match the live Simplenight filter panel copy on staging
 * (e.g. "Very Good (7+)", "Excellent (9+)", "Good (5+)").
 */
export const GUEST_SCORE_THRESHOLDS: Record<string, number> = {
  Good: 5.0,
  'Very Good': 7.0,
  Excellent: 9.0,
};

/** Returns true if a numeric score satisfies the minimum for a given label. */
export function meetsGuestScoreThreshold(score: number, label: string): boolean {
  const threshold = GUEST_SCORE_THRESHOLDS[label];
  if (threshold === undefined) {
    throw new Error(`Unknown guest score label: "${label}". Update GUEST_SCORE_THRESHOLDS.`);
  }
  return score >= threshold;
}
