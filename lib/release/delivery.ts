// Can the release be delivered to the distributor? Computed by code from the
// sources (ticket Juridique 08, Récap Sortie, MVP): the release's own
// identifiers and what the other workflows owe the Distribution
// (lib/workflow-status/rules.ts, `dependencies`). Two lists, as the ticket
// asks: what blocks the delivery, and what remains to follow without
// blocking it. Nothing is stored; pure, so the server action checks again
// with the same rule before recording.

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { legalActionHref } from "@/lib/legal/plan/where";
import type { TrackedItem } from "@/lib/legal/tracking/state";
import type { Dependency } from "@/lib/workflow-status/rules";

export type DeliveryCheck = {
  key: string;
  label: string;
  done: boolean;
  // Why it is (not) done, in words.
  detail: string;
  // Where it is done.
  href: string;
};

export type DeliveryReadiness = {
  ready: boolean;
  blocking: DeliveryCheck[];
  remaining: DeliveryCheck[];
};

export function deliveryReadiness(input: {
  projectId: string;
  release: {
    isrc: string | null;
    upc: string | null;
    plannedDate: string | null;
  };
  dependencies: Dependency[];
  // The Juridique's actions (empty before its plan, or without the right).
  legalItems?: TrackedItem[];
}): DeliveryReadiness {
  const t = fr.releaseDelivery.checks;
  const prepare = routes.projectRelease(input.projectId);
  const blocking: DeliveryCheck[] = [
    {
      key: "isrc",
      label: t.isrc,
      done: input.release.isrc !== null,
      detail: input.release.isrc ?? t.missing,
      href: prepare,
    },
    {
      key: "date",
      label: t.date,
      done: input.release.plannedDate !== null,
      detail: input.release.plannedDate ? t.dateSet : t.missing,
      href: prepare,
    },
    ...input.dependencies
      .filter((dep) => dep.to === "distribution")
      .map((dep) => ({
        key: dep.key,
        label: dep.what,
        done: dep.state === "ready",
        detail: dep.note,
        href: dep.href,
      })),
  ];
  // « L'UPC appartient à la Release » (ticket): often given by the
  // distributor itself, so followed, never blocking.
  const remaining: DeliveryCheck[] = [
    {
      key: "upc",
      label: t.upc,
      done: input.release.upc !== null,
      detail: input.release.upc ?? t.upcLater,
      href: prepare,
    },
    // Fiches, contracts, splits, SACEM still open: they do not block the
    // delivery (only a borrowing does, ticket 08), but are said here
    // (UX test of 09/10/2026: a release delivered with no signed contract
    // and no alert).
    ...(input.legalItems ?? [])
      .filter(
        (item) =>
          item.kind !== "clearance" &&
          item.current !== "done" &&
          item.current !== "obsolete",
      )
      .map((item) => ({
        key: `legal-${item.id}`,
        label: item.subject ? `${item.label} · ${item.subject}` : item.label,
        done: false,
        detail: item.reason,
        href: item.sourceHref ?? legalActionHref(input.projectId, item.kind),
      })),
  ];
  return {
    ready: blocking.every((check) => check.done),
    blocking,
    remaining,
  };
}
