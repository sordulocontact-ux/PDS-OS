// The six consistency checks (ticket « Distribution » § 8, CA11). Two
// signals never mixed, so one can tell what is calculated from what was
// really checked: the code's own reading of the sources (`computed`: never
// « conforme », at most « cohérent ») and a person's result, recorded with
// who and when (supabase/migrations/20261011100201). Pure.

import type { DossierParams } from "@/lib/distribution/dossier";
import {
  isReady,
  type Readiness,
  type ReadinessInput,
} from "@/lib/distribution/readiness";
import { fr } from "@/lib/i18n/fr";

export const CHECK_KEYS = [
  "audio",
  "identity",
  "identifiers",
  "rights",
  "visual",
  "calendar",
] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];

export const CHECK_RESULTS = [
  "unchecked",
  "compliant",
  "non_compliant",
  "not_applicable",
] as const;
export type CheckResult = (typeof CHECK_RESULTS)[number];

export const isCheckKey = (value: string): value is CheckKey =>
  (CHECK_KEYS as readonly string[]).includes(value);
export const isCheckResult = (value: string): value is CheckResult =>
  (CHECK_RESULTS as readonly string[]).includes(value);

// coherent: the sources agree as far as code can tell; gap: they do not;
// human: code cannot tell (rights against territories), a person must.
export type ComputedSignal = {
  status: "coherent" | "gap" | "human";
  text: string;
};

export type RecordedCheck = {
  key: CheckKey;
  result: CheckResult;
  note: string | null;
  checkedBy: string | null;
  checkedAt: string | null;
};

const same = (a: string, b: string) =>
  a.trim().toLocaleLowerCase("fr") === b.trim().toLocaleLowerCase("fr");

export function computedSignal(
  key: CheckKey,
  input: {
    sources: ReadinessInput;
    readiness: Readiness;
    params: DossierParams;
    formatDate: (iso: string) => string;
  },
): ComputedSignal {
  const t = fr.distribution.checks.computed;
  const { sources, readiness, params } = input;
  const notReady = (prefix: string) =>
    readiness.items.filter(
      (item) => item.key.startsWith(prefix) && item.blocking && !isReady(item),
    );
  const labels = (items: Readiness["items"]) =>
    items
      .map((item) =>
        item.subject ? `${item.label} · ${item.subject}` : item.label,
      )
      .join(", ");
  const single = sources.titles.length === 1 ? sources.titles[0] : null;

  switch (key) {
    case "audio": {
      if (sources.titles.length === 0)
        return { status: "gap", text: t.noTitle };
      const missing = notReady("final-");
      return missing.length
        ? { status: "gap", text: t.missing(labels(missing)) }
        : { status: "coherent", text: t.audio };
    }
    case "identity": {
      const missing = [
        ...notReady("identity-"),
        ...readiness.items.filter(
          (item) => item.key === "release" && !isReady(item),
        ),
      ];
      if (missing.length)
        return { status: "gap", text: t.missing(labels(missing)) };
      if (
        single &&
        sources.release &&
        !same(single.label, sources.release.title)
      )
        return {
          status: "gap",
          text: t.titleDiffers(sources.release.title, single.label),
        };
      return { status: "coherent", text: t.identity };
    }
    case "identifiers": {
      const missing = [
        ...notReady("isrc-"),
        ...notReady("credits-"),
        ...notReady("pline-"),
      ];
      if (missing.length)
        return { status: "gap", text: t.missing(labels(missing)) };
      if (
        single?.isrc &&
        sources.release?.isrc &&
        single.isrc !== sources.release.isrc
      )
        return {
          status: "gap",
          text: t.isrcDiffers(sources.release.isrc, single.isrc),
        };
      return { status: "coherent", text: t.identifiers };
    }
    case "rights": {
      // A borrowing to secure is readable by all (distribution_legal_blockers).
      const blocking = sources.legal.blockers;
      if (blocking.length)
        return {
          status: "gap",
          text: t.missing(
            blocking
              .map((b) => fr.distribution.readiness.items.clearance(b.work))
              .join(", "),
          ),
        };
      // No structured rights per territory exist: code never says « cohérent ».
      return {
        status: "human",
        text: sources.constraints.length
          ? t.rightsConstraints(sources.constraints.length)
          : t.rights,
      };
    }
    case "visual": {
      const cover = sources.cover;
      if (!cover) return { status: "gap", text: t.noCover };
      // The cover delivered by the Production, not the sheet's status.
      return cover.delivered
        ? { status: "coherent", text: t.visual(cover.title) }
        : { status: "gap", text: t.coverNotValidated(cover.title) };
    }
    case "calendar": {
      const date = sources.releaseDate?.date ?? null;
      if (!date) return { status: "gap", text: t.noDate };
      const late = [
        params.preorderOn && params.preorderOn >= date ? t.preorderLate : null,
        params.prelistenOn && params.prelistenOn >= date
          ? t.prelistenLate
          : null,
      ].filter((value): value is string => value !== null);
      if (late.length) return { status: "gap", text: late.join(" ") };
      const unsaid = [
        params.priceTier === null,
        params.preorder === null,
        params.prelisten === null,
      ].some(Boolean);
      if (unsaid) return { status: "gap", text: t.paramsMissing };
      return { status: "coherent", text: t.calendar(input.formatDate(date)) };
    }
  }
}

/** The six checks in order, « non vérifié » when nobody recorded one. */
export function checksOf(rows: RecordedCheck[]): RecordedCheck[] {
  return CHECK_KEYS.map(
    (key) =>
      rows.find((row) => row.key === key) ?? {
        key,
        result: "unchecked",
        note: null,
        checkedBy: null,
        checkedAt: null,
      },
  );
}
