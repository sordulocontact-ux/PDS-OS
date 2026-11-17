/**
 * A forecast's horizon in words (Ibé, 17/11/2026: « des mois / année » rather
 * than 30, 60 or 90 days): the four horizons of TREASURY_HORIZONS
 * (lib/finance/treasury.ts) read as months or a year; any other number of
 * days (« à payer » asked by PO) stays in days.
 */
const MONTHS: Record<number, number> = { 30: 1, 90: 3, 180: 6 };

/** « 1 mois », « 3 mois », « 1 an »: after « dans », « d'ici », « sur ». */
export function horizonSpan(days: number): string {
  if (days === 365) return "1 an";
  const months = MONTHS[days];
  return months ? `${months} mois` : `${days} jours`;
}

/** « le mois à venir », « les 3 mois à venir », « l'année à venir ». */
export function horizonAhead(days: number): string {
  if (days === 365) return "l'année à venir";
  const months = MONTHS[days];
  if (months === 1) return "le mois à venir";
  return months ? `les ${months} mois à venir` : `les ${days} jours à venir`;
}
