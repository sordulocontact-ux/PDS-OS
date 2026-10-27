// « Prêt pour la sortie » (ticket Juridique 08, proto « Projet complet »):
// one control per real source, in five domains, computed at each read —
// the Master, the metadata, the visuals and the release from the
// Distribution's own reading of its sources (lib/distribution/readiness.ts),
// the rights from the Juridique's démarches — then the direction's waivers,
// the label's policy (does the SACEM block?) and its final validation.
// Pure, client-safe: never stored, never decided by PO (CLAUDE.md, rule 6).

import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { legalReadiness as frLegalReadiness } from "@/lib/i18n/fr/legal-readiness";
import type { ReadinessItem } from "@/lib/distribution/readiness";
import type { InvoiceStateRow } from "@/lib/invoices/states";
import { invoiceHref } from "@/lib/invoices/href";
import type { Demarche } from "@/lib/legal/demarches/build";
import { formatDay } from "@/lib/utils/day";
import { legalRefSlug } from "@/lib/ui/legal-steps";

const fr = { legalDemarches, legalReadiness: frLegalReadiness };

export const READINESS_DOMAINS = [
  "master",
  "rights",
  "metadata",
  "assets",
  "distribution",
] as const;
export type ReadinessDomain = (typeof READINESS_DOMAINS)[number];

export type ReadinessControl = {
  key: string;
  domain: ReadinessDomain;
  label: string;
  // Blocks the release while open (policy of the label).
  blocking: boolean;
  status: "ok" | "open" | "waived";
  // Where it stands, in words.
  reason: string;
  next: string | null;
  responsible: string | null;
  source: string;
  href: string | null;
  waiver: { reason: string; by: string; at: string } | null;
  // The final validation itself.
  final?: boolean;
};

export type ReadinessVerdict = "no" | "risk" | "ok";

export type LegalReadiness = {
  verdict: ReadinessVerdict;
  controls: ReadinessControl[];
  // Open and blocking (« À résoudre avant sortie »).
  blocking: ReadinessControl[];
  // Open and not blocking, or let through by a waiver (« Reste à suivre »).
  toFollow: ReadinessControl[];
  done: number;
  total: number;
  sacemBlocks: boolean;
  validated: { by: string; at: string } | null;
  // JUR-07: delivered to the distributor (« 2026-12-01 »), else null.
  deliveredOn: string | null;
  // The controls counted at the top: all but the direction's validation,
  // which is the decision, not a control.
  counted: { ok: number; total: number };
};

export type ReadinessWaiver = {
  key: string;
  reason: string;
  by: string;
  at: string;
};

const t = fr.legalReadiness;

const DOMAIN_OF: Record<ReadinessItem["module"], ReadinessDomain | null> = {
  master: "master",
  catalog: "metadata",
  design: "assets",
  project: "distribution",
  legal: null,
};

const keyOf = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9_:.-]+/g, "-")
    .slice(0, 120);

function fromDistribution(items: ReadinessItem[]): ReadinessControl[] {
  return items.flatMap((item): ReadinessControl[] => {
    const domain = DOMAIN_OF[item.module];
    if (!domain) return [];
    const ready = item.state === "validated" || item.state === "available";
    return [
      {
        key: keyOf(`dist:${item.key}`),
        domain,
        label: item.subject ? `${item.label} · ${item.subject}` : item.label,
        blocking: item.blocking,
        status: ready ? "ok" : "open",
        reason: item.detail,
        next: null,
        responsible: null,
        source: t.sources[item.module],
        href: item.href,
        waiver: null,
      },
    ];
  });
}

const SACEM_FILED = ["submitted", "processing", "completed"];

function fromDemarches(
  demarches: Demarche[],
  sacemBlocks: boolean,
): ReadinessControl[] {
  return demarches
    .filter((d) => !d.proposed && d.step.status !== "obsolete")
    .map((d): ReadinessControl => {
      const done = d.step.status === "done";
      const sacem = d.parts[0]?.panel;
      const filed =
        d.kind === "sacem" &&
        sacem?.kind === "sacem" &&
        SACEM_FILED.includes(sacem.title.formality?.status ?? "");
      const ok = done || filed;
      return {
        key: keyOf(`${d.kind}:${legalRefSlug(d.ref)}`),
        domain: "rights",
        label: d.kind === "person" ? t.contractOf(d.subject) : d.step.title,
        blocking: d.kind === "clearance" || (d.kind === "sacem" && sacemBlocks),
        status: ok ? "ok" : "open",
        reason: ok
          ? (d.step.summary ?? t.done)
          : (d.current?.badge.label ?? t.notYet),
        next: ok ? null : (d.step.actor?.todo ?? null),
        responsible: d.step.owner?.name ?? null,
        source: t.sources.legal,
        href: d.step.href,
        waiver: null,
      };
    });
}

/** Each invoice received of a credited person (the engineer's, a contract's):
 * open until paid, never blocking — the label pays after the release as
 * well (decision of 20/10/2026, proto invControl). An invoice still awaited
 * has nothing to pay yet: its démarche says it. */
function fromInvoices(
  invoices: InvoiceStateRow[],
  projectId: string | null,
  direction: string,
): ReadinessControl[] {
  const ti = t.invoice;
  return invoices
    .filter((i) => i.state !== "asked" && i.receivedOn)
    .map((i): ReadinessControl => {
      const at = formatDay(i.receivedOn!);
      return {
        key: keyOf(`invoice:${i.invoiceId}`),
        domain: i.origin === "master" ? "master" : "rights",
        label: ti.label(i.contactName),
        blocking: false,
        status: i.state === "paid" ? "ok" : "open",
        reason:
          i.state === "paid"
            ? ti.paid(formatDay(i.paidOn ?? i.receivedOn!))
            : i.state === "rib"
              ? ti.rib(at)
              : ti.toPay(at, formatDay(i.dueOn ?? i.receivedOn!)),
        next:
          i.state === "paid"
            ? null
            : i.state === "rib"
              ? ti.nextRib
              : ti.nextPay,
        responsible: direction,
        source: ti.source,
        href: projectId
          ? invoiceHref(projectId, { ...i, id: i.invoiceId })
          : null,
        waiver: null,
      };
    });
}

/** The controls, then the verdict: « Non prête » while a blocking control
 * is open, « À risque » with a waiver or something to follow, else « Prête
 * à sortir ». The final validation never counts against itself. */
export function legalReadiness(input: {
  distribution: ReadinessItem[] | null;
  demarches: Demarche[];
  waivers: ReadinessWaiver[];
  sacemBlocks: boolean;
  validated: { by: string; at: string } | null;
  deliveredOn?: string | null;
  direction: string;
  // The project's invoices, where each one stands (never their content).
  invoices?: InvoiceStateRow[];
  projectId?: string;
}): LegalReadiness {
  const waiverOf = new Map(input.waivers.map((w) => [w.key, w]));
  const controls = [
    ...fromDistribution(input.distribution ?? []),
    ...fromDemarches(input.demarches, input.sacemBlocks),
    ...fromInvoices(
      input.invoices ?? [],
      input.projectId ?? null,
      input.direction,
    ),
  ]
    .map((c) => {
      const w = c.status === "open" ? waiverOf.get(c.key) : undefined;
      return w
        ? {
            ...c,
            status: "waived" as const,
            waiver: { reason: w.reason, by: w.by, at: w.at },
          }
        : c;
    })
    .sort(
      (a, b) =>
        READINESS_DOMAINS.indexOf(a.domain) -
        READINESS_DOMAINS.indexOf(b.domain),
    );
  const final: ReadinessControl = {
    key: "final",
    domain: "distribution",
    label: t.final,
    blocking: true,
    status: input.validated ? "ok" : "open",
    reason: input.validated ? t.validatedBy(input.validated.by) : t.finalLast,
    next: input.validated ? null : fr.legalDemarches.ready.todo,
    responsible: input.direction,
    source: fr.legalDemarches.titles.ready,
    href: null,
    waiver: null,
    final: true,
  };
  const all = [...controls, final];
  const blocking = controls.filter((c) => c.blocking && c.status === "open");
  const toFollow = controls.filter(
    (c) => c.status === "waived" || (!c.blocking && c.status === "open"),
  );
  return {
    verdict: blocking.length > 0 ? "no" : toFollow.length > 0 ? "risk" : "ok",
    controls: all,
    blocking,
    toFollow,
    done: all.filter((c) => c.status === "ok").length,
    total: all.length,
    sacemBlocks: input.sacemBlocks,
    validated: input.validated,
    deliveredOn: input.deliveredOn ?? null,
    counted: {
      ok: controls.filter((c) => c.status === "ok").length,
      total: controls.length,
    },
  };
}
