// The one next action of a deliverable's production (PROD-001, PROD-007):
// the first thing still undone in the order of the workflow, with why it
// matters, who is expected and what else is missing. Pure, client-safe;
// every state comes from lib/production (phase, readiness, blockers,
// delivery decisions), never from PO.

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

import { blank, nextContext, nobody } from "./context";
import { deliveryNext } from "./delivery";
import { preproductionNext } from "./preproduction";
import { postNext, shotNext } from "./shoot-post";
import type { NextInput, ProductionNext } from "./types";

const t = fr.productionNext;

export function productionNext(input: NextInput): ProductionNext {
  const ctx = nextContext(input);
  const { link, owner } = ctx;

  if (!input.hasSource)
    return {
      ...nobody,
      kind: "wait",
      title: t.steps.noSource.title,
      why: t.steps.noSource.why,
      link: {
        label: t.steps.noSource.link,
        href: routes.projectDesign(input.projectId),
        place: t.places.conception,
      },
    };

  // Transmitted and still standing: closed by its owner, then finished.
  if (
    input.phase === "handed_off" &&
    !input.delivery?.handoffStale &&
    !input.sheet?.closed &&
    input.stageState === "in_progress"
  )
    return owner({
      ...blank,
      kind: "act",
      title: t.steps.close.title,
      why: t.steps.close.why,
      done: t.done.handedOff,
      link: link(t.steps.close.link, "delivery", "closure", "closure"),
    });
  if (input.phase === "handed_off" && !input.delivery?.handoffStale)
    return {
      ...nobody,
      kind: "done",
      title: t.steps.finished.title,
      why: t.steps.finished.why,
      done: t.done.handedOff,
      link: {
        label: t.steps.finished.link,
        href: routes.projectActivations(input.projectId),
        place: t.places.activations,
      },
    };

  if (
    input.stageState === "awaiting_validation" ||
    input.stageState === "validated"
  )
    return {
      ...nobody,
      kind: "wait",
      title: t.steps.locked.title,
      why: t.steps.locked.why,
      link: null,
    };

  if (!input.sheet)
    return owner({
      ...blank,
      kind: "act",
      title: t.steps.open.title,
      why: t.steps.open.why,
      link: link(t.steps.open.link, "", "organisation", "organisation"),
    });

  switch (input.phase) {
    case "to_prepare":
    case "preproduction":
      return preproductionNext(ctx);
    case "ready":
      return owner({
        ...blank,
        kind: "act",
        dueKey: "shoot",
        title:
          input.shoot?.state === "postponed"
            ? t.steps.launch.titlePostponed
            : t.steps.launch.title,
        why: t.steps.launch.why,
        done: t.done.ready,
        link: link(t.steps.launch.link, "shoot", "shoot-state", "shootState"),
      });
    case "shooting":
      return owner({
        ...blank,
        kind: "act",
        dueKey: "shoot",
        title: t.steps.endShoot.title,
        why: t.steps.endShoot.why,
        link: link(t.steps.endShoot.link, "shoot", "shoot-state", "shootState"),
      });
    case "shot":
      return shotNext(ctx);
    case "post":
      return postNext(ctx);
    case "final_check":
    case "delivered":
    case "handed_off":
      return deliveryNext(ctx);
  }
}
