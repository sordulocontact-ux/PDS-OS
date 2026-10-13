// The next action once the shoot ended and during the postproduction: the
// rushes secured, the blocking incidents resolved, every step given to a
// provider, then one decision per version (PROD-033). Client-safe.

import { fr } from "@/lib/i18n/fr";

import { blank, type NextContext } from "./context";
import { deliveryNext } from "./delivery";
import type { ProductionNext } from "./types";

const t = fr.productionNext;

export function shotNext(ctx: NextContext): ProductionNext {
  const { input, link, owner } = ctx;
  const s = input.shoot;
  const done =
    s &&
    (s.state === "done" || s.state === "partial" || s.state === "interrupted")
      ? t.done.shoot[s.state]
      : null;
  const blockers = s?.postBlockers ?? [];
  const declarations = blockers.flatMap((b) =>
    b.kind === "declaration"
      ? [fr.productionShoot.files.declarations[b.key]]
      : [],
  );
  if (declarations.length > 0)
    return owner({
      ...blank,
      kind: "act",
      title: t.steps.declarations.title,
      why: t.steps.declarations.why,
      missing: declarations,
      done,
      link: link(
        t.steps.declarations.link,
        "shoot",
        "shoot-files",
        "shootFiles",
      ),
    });
  for (const b of blockers)
    if (b.kind === "incident")
      return owner({
        ...blank,
        kind: "act",
        title: t.steps.incident.title(b.title),
        why: t.steps.incident.why,
        done,
        link: link(
          t.steps.incident.link,
          "shoot",
          "shoot-incidents",
          "incidents",
        ),
      });
  return organizePost(ctx, done ? t.done.secured : null);
}

function organizePost(ctx: NextContext, done: string | null): ProductionNext {
  return ctx.owner({
    ...blank,
    kind: "act",
    title: t.steps.organizePost.title,
    why: t.steps.organizePost.why,
    done,
    link: ctx.link(t.steps.organizePost.link, "post", "steps", "steps"),
  });
}

export function postNext(ctx: NextContext): ProductionNext {
  const { input, link, by, owner } = ctx;
  const p = input.post;
  if (!p || p.steps.length === 0) return organizePost(ctx, null);

  const latest = p.versions[0] ?? null;
  const versionsLink = link(
    t.steps.review.link,
    "post",
    "versions",
    "versions",
  );
  const reviewer = { name: null, isViewer: p.viewerReviews };

  if (!latest || latest.status === "changes_requested") {
    // Before a version arrives, every step has its provider.
    const unassigned = p.steps.filter((s) => s.holder === null);
    if (unassigned.length > 0)
      return owner({
        ...blank,
        kind: "act",
        title: t.steps.assignStep.title(unassigned[0].label),
        why: t.steps.assignStep.why,
        missing: unassigned.slice(1).map((s) => s.label),
        link: link(t.steps.assignStep.link, "post", "steps", "steps"),
      });
    const n = latest ? latest.number + 1 : 1;
    return {
      ...blank,
      kind: "wait",
      title: t.steps.awaitVersion.title(n, p.maker),
      why: t.steps.awaitVersion.why(n),
      who: { name: p.maker, role: "provider" },
      viewerIsWho: false,
      missing:
        p.pendingCorrections > 0
          ? [t.missing.corrections(p.pendingCorrections)]
          : [],
      done: latest ? t.done.changes(latest.number) : null,
      // The owner may still record a version received elsewhere.
      link: input.owner.isViewer
        ? link(t.steps.awaitVersion.link, "post", "versions", "versions")
        : null,
    };
  }
  switch (latest.status) {
    case "draft":
      return owner({
        ...blank,
        kind: "act",
        title: t.steps.submitDraft.title(latest.number),
        why: t.steps.submitDraft.why,
        link: versionsLink,
      });
    case "in_review":
      return by(reviewer, "reviewer", p.viewerReviews, {
        ...blank,
        kind: "decision",
        title: t.steps.review.title(latest.number),
        why: t.steps.review.why,
        link: versionsLink,
      });
    case "final_review":
      return by(reviewer, "reviewer", p.viewerReviews, {
        ...blank,
        kind: "decision",
        title: t.steps.validate.title(latest.number),
        why: t.steps.validate.why,
        link: link(t.steps.validate.link, "post", "decision", "decision"),
      });
    case "refused":
      return owner({
        ...blank,
        kind: "act",
        title: t.steps.refused.title,
        why: t.steps.refused.why(latest.number),
        link: versionsLink,
      });
    case "approved":
      return deliveryNext(ctx);
  }
}
