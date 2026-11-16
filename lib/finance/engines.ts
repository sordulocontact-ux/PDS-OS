// The engines of Ibé's ticket « Cockpit Finance » (lot 5): what the Orchard
// rule, the planned shows and the Pay Later draws make happen, computed at
// each reading from the facts the Finance entered, never stored. Moving a
// show moves its cost, its provisional titles and the Orchard advance they
// trigger. Client-safe, pure code.

export type EngineSettings = {
  orchardTrancheCents: number;
  orchardTitlesPerTranche: number;
  // Titles delivered since the last advance.
  orchardTitlesCounted: number;
};

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  orchardTrancheCents: 5200000,
  orchardTitlesPerTranche: 12,
  orchardTitlesCounted: 0,
};

export type ShowFormat = {
  id: string;
  name: string;
  costCents: number;
  provisionalTitles: number;
  templateId: string | null;
  archived: boolean;
};

export type Show = {
  id: string;
  formatId: string;
  label: string;
  plannedOn: string;
  // Its budget once opened: its lines count instead of the format's cost.
  costCenterId: string | null;
  cancelled: boolean;
};

export type CreditLine = {
  id: string;
  name: string;
  limitCents: number;
  archived: boolean;
};

export type CreditDraw = {
  id: string;
  creditLineId: string;
  lineId: string | null;
  label: string;
  cents: number;
  drawnOn: string;
  installments: number;
  feeBp: number;
};

export type EngineData = {
  settings: EngineSettings;
  formats: ShowFormat[];
  shows: Show[];
  creditLines: CreditLine[];
  draws: CreditDraw[];
};

export const EMPTY_ENGINES: EngineData = {
  settings: DEFAULT_ENGINE_SETTINGS,
  formats: [],
  shows: [],
  creditLines: [],
  draws: [],
};

/** A move the engines make: an Orchard advance in, a show's cost out, a
 * Pay Later installment out. */
export type EngineMove = {
  key: string;
  day: string;
  label: string;
  direction: "in" | "out";
  cents: number;
  engine: "orchard" | "show" | "pay_later";
};

const addMonths = (day: string, months: number) => {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(d, last));
  return date.toISOString().slice(0, 10);
};

/** A draw's installments: monthly from a month after it, the amount and
 * its fee split evenly (the last one takes the rounding). */
export function installmentsOf(draw: CreditDraw) {
  const total = Math.round((draw.cents * (10000 + draw.feeBp)) / 10000);
  const each = Math.floor(total / draw.installments);
  return Array.from({ length: draw.installments }, (_, i) => ({
    day: addMonths(draw.drawnOn, i + 1),
    cents: i === draw.installments - 1 ? total - each * i : each,
    // What it pays back of the amount itself (for the credit still used).
    principalCents:
      i === draw.installments - 1
        ? draw.cents - Math.floor(draw.cents / draw.installments) * i
        : Math.floor(draw.cents / draw.installments),
  }));
}

/** What a credit line still lends today: its limit less the principal not
 * paid back yet. */
export function creditUsed(
  line: CreditLine,
  draws: CreditDraw[],
  today: string,
) {
  return draws
    .filter((d) => d.creditLineId === line.id)
    .reduce(
      (sum, d) =>
        sum +
        installmentsOf(d)
          .filter((x) => x.day > today)
          .reduce((s, x) => s + x.principalCents, 0),
      0,
    );
}

export const liveShows = (data: EngineData) =>
  data.shows
    .filter((s) => !s.cancelled)
    .sort((a, b) => a.plannedOn.localeCompare(b.plannedOn));

/**
 * The Orchard advances the planned shows trigger: the titles counted since
 * the last advance, then each show's provisional titles in date order;
 * every time the count reaches a tranche, an advance on that show's day.
 */
export function orchardAdvances(data: EngineData, today: string) {
  const { orchardTitlesPerTranche: per, orchardTrancheCents: cents } =
    data.settings;
  const formats = new Map(data.formats.map((f) => [f.id, f]));
  let counted = data.settings.orchardTitlesCounted;
  const advances: { day: string; cents: number; show: Show | null }[] = [];
  // Already a full tranche counted: due now.
  while (counted >= per) {
    advances.push({ day: today, cents, show: null });
    counted -= per;
  }
  for (const show of liveShows(data)) {
    if (show.plannedOn < today) continue;
    counted += formats.get(show.formatId)?.provisionalTitles ?? 0;
    while (counted >= per) {
      advances.push({ day: show.plannedOn, cents, show });
      counted -= per;
    }
  }
  return { advances, counted, per };
}

/** Every move the engines make from today up to `until`. */
export function engineMoves(
  data: EngineData,
  today: string,
  until: string,
  labels: {
    orchard: string;
    show: (label: string) => string;
    installment: (label: string, n: number, of: number) => string;
  },
): EngineMove[] {
  const formats = new Map(data.formats.map((f) => [f.id, f]));
  const shows = liveShows(data)
    .filter(
      (s) => !s.costCenterId && s.plannedOn >= today && s.plannedOn <= until,
    )
    .map((s): EngineMove => ({
      key: `show-${s.id}`,
      day: s.plannedOn,
      label: labels.show(s.label),
      direction: "out",
      cents: formats.get(s.formatId)?.costCents ?? 0,
      engine: "show",
    }));
  const advances = orchardAdvances(data, today)
    .advances.filter((a) => a.day <= until)
    .map((a, i): EngineMove => ({
      key: `orchard-${i}`,
      day: a.day,
      label: labels.orchard,
      direction: "in",
      cents: a.cents,
      engine: "orchard",
    }));
  const installments = data.draws.flatMap((d) =>
    installmentsOf(d).flatMap((x, i): EngineMove[] =>
      x.day > today && x.day <= until
        ? [
            {
              key: `pl-${d.id}-${i}`,
              day: x.day,
              label: labels.installment(d.label, i + 1, d.installments),
              direction: "out",
              cents: x.cents,
              engine: "pay_later",
            },
          ]
        : [],
    ),
  );
  return [...advances, ...shows, ...installments].filter((m) => m.cents > 0);
}

/** The installments already due since a day (the real balance pays them):
 * by day, for the treasury's real part. */
export function installmentsPaid(
  data: EngineData,
  after: string,
  today: string,
) {
  return data.draws.flatMap((d) =>
    installmentsOf(d)
      .filter((x) => x.day > after && x.day <= today)
      .map((x) => ({ day: x.day, cents: x.cents })),
  );
}
