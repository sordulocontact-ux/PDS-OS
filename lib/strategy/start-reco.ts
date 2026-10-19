// Which way into the Stratégie the code recommends (proto stratEntry, same
// rule as the Cadrage's recommendedStart): an exchange when what is still
// to decide outnumbers what PDS OS already knows. Known at the start: the
// Brief's needs to turn into levers (Dispositif), the release date
// (Calendrier), the envelope (Budget), the Cadrage's objective (Objectifs).
// Client-safe, pure.

export function knownAtStart(i: {
  openNeeds: number;
  referenceDate: string | null;
  envelopeCents: number | null;
  framingObjective: string | null;
}): number {
  return [
    i.openNeeds > 0,
    i.referenceDate !== null,
    i.envelopeCents !== null,
    Boolean(i.framingObjective),
  ].filter(Boolean).length;
}
