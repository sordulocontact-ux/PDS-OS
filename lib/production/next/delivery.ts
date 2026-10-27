// The next action once a version is validated: the expected files, their
// technical check, the delivery, then the transmission to Activations —
// three distinct decisions (PROD-038). Client-safe.

import { productionNext } from "@/lib/i18n/fr/production-next";

import { blank, type NextContext } from "./context";
import type { ProductionNext } from "./types";

const fr = { productionNext };

const t = fr.productionNext;

export function deliveryNext(ctx: NextContext): ProductionNext {
  const { input, link, owner } = ctx;
  const d = input.delivery;
  const exportsLink = (label: string) =>
    link(label, "delivery", "exports", "exports");
  const decisionsLink = (label: string) =>
    link(label, "delivery", "decisions", "decisions");
  const checklist = (done: string | null) =>
    owner({
      ...blank,
      kind: "act",
      dueKey: "exports",
      title: t.steps.checklist.title,
      why: t.steps.checklist.why,
      done,
      link: exportsLink(t.steps.checklist.link),
    });
  if (!d) return checklist(null);

  const approved =
    d.approvedVersion !== null ? t.done.approved(d.approvedVersion) : null;
  const s = d.summary;

  if (d.decisions.delivery.state === "done") {
    const again = d.handoffStale;
    return owner({
      ...blank,
      kind: "act",
      title: again ? t.steps.handoff.titleAgain : t.steps.handoff.title,
      why: again ? t.steps.handoff.whyAgain : t.steps.handoff.why,
      done: t.done.delivered,
      link: link(t.steps.handoff.link, "delivery", "activations", "handoff"),
    });
  }
  if (d.decisions.technical.state === "done")
    return owner({
      ...blank,
      kind: "decision",
      dueKey: "delivery",
      title: t.steps.deliver.title,
      why: t.steps.deliver.why,
      done: t.done.checked,
      link: decisionsLink(t.steps.deliver.link),
    });
  if (s.total === 0) return checklist(approved);
  if (s.not_ok > 0)
    return owner({
      ...blank,
      kind: "act",
      dueKey: "exports",
      title: t.steps.notOk.title(s.not_ok),
      why: t.steps.notOk.why,
      done: approved,
      link: exportsLink(t.steps.notOk.link),
    });
  if (s.stale > 0 || s.to_check > 0) {
    const stale = s.stale > 0;
    return owner({
      ...blank,
      kind: "act",
      dueKey: "exports",
      title: stale
        ? t.steps.stale.title(s.stale)
        : t.steps.toCheck.title(s.to_check),
      why: stale ? t.steps.stale.why : t.steps.toCheck.why,
      done: approved,
      link: exportsLink(t.steps.toCheck.link),
    });
  }
  return owner({
    ...blank,
    kind: "decision",
    dueKey: "exports",
    title: t.steps.confirmChecked.title,
    why: t.steps.confirmChecked.why,
    done: approved,
    link: decisionsLink(t.steps.confirmChecked.link),
  });
}
