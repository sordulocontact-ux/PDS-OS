// The sentence of one event of a sheet's activity log (PROD-002, PROD-008),
// written by code from what the database kept before and after. Pure,
// client-safe.

import { formatEuros } from "@/lib/budget/types";
import { productionHistory } from "@/lib/i18n/fr/production-history";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import { stepLabel } from "@/lib/production/post/labels";
import { postStepKeyOf } from "@/lib/production/post/rules";
import { isCheckKey } from "@/lib/production/preprod/types";
import { isShootState } from "@/lib/production/shoot/rules";
import { formatDate } from "@/lib/release/format";

const fr = {
  productionPreprod,
  productionShoot,
  productionPost,
  productionHistory,
};

export type HistoryEvent = {
  id: string;
  entity: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  // Null: done through a provider's link, or by the database.
  actorName: string | null;
  at: string;
};

type Names = {
  holder: (value: unknown) => string;
  person: (personId: unknown) => string;
};

const t = fr.productionHistory;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : 0);
const day = (v: unknown) => (typeof v === "string" && v ? formatDate(v) : "—");

const DATE_KEYS = [
  "shoot",
  "postStart",
  "postEnd",
  "delivery",
  "envelope",
] as const;

/** « a validé la V3 », « a confié « Montage » : Lina → Jo »… The actor's
 * name goes before it, unless the sentence carries no actor. */
export function describeEvent(e: HistoryEvent, names: Names): string {
  const b = e.before ?? {};
  const a = e.after ?? {};
  const change = (before: string, after: string) => t.arrow(before, after);
  switch (`${e.entity}.${e.action}`) {
    case "version.created":
      return t.version.created(num(a.number));
    case "version.status": {
      const status = str(a.status) as keyof typeof t.version.status;
      const line = t.version.status[status]?.(num(a.number)) ?? "";
      return a.note ? `${line} · ${t.note(str(a.note))}` : line;
    }
    case "request.created":
      return t.request.created(
        num(a.number),
        names.holder(a.holder),
        day(a.due),
      );
    case "request.holder":
      return t.request.holder(
        num(a.number),
        change(names.holder(b.holder), names.holder(a.holder)),
      );
    case "request.due":
      return t.request.due(num(a.number), change(day(b.due), day(a.due)));
    case "request.status": {
      const n = num(a.number);
      if (a.status === "viewed") return t.request.viewed(n);
      if (a.status === "treated") return t.request.treated(n);
      return b.status === a.status ? t.request.reminded(n) : t.request.sent(n);
    }
    case "action.status": {
      const status = str(a.status) as keyof typeof t.action.status;
      return t.action.status[status]?.(str(a.title)) ?? "";
    }
    case "action.holder":
      return t.action.holder(
        str(a.title),
        change(names.holder(b.holder), names.holder(a.holder)),
      );
    case "action.due":
      return t.action.due(str(a.title), change(day(b.due), day(a.due)));
    case "check.confirmed":
    case "check.required": {
      const key = a.key;
      const label = isCheckKey(key)
        ? fr.productionPreprod.readiness.checks[key]
        : str(key);
      if (e.action === "required")
        return a.required ? t.check.required(label) : t.check.optional(label);
      return a.confirmed === false
        ? t.check.reopened(label)
        : t.check.confirmed(label);
    }
    case "sheet.dates": {
      const show = (key: string, v: unknown) =>
        key === "envelope"
          ? typeof v === "number"
            ? formatEuros(v)
            : "—"
          : day(v);
      return t.sheet.dates(
        DATE_KEYS.filter((k) => b[k] !== a[k])
          .map(
            (k) =>
              `${t.sheet.dateLabels[k]} (${change(show(k, b[k]), show(k, a[k]))})`,
          )
          .join(", "),
      );
    }
    case "sheet.location": {
      const statuses = fr.productionPreprod.location.statuses;
      const status = (v: unknown) =>
        statuses[str(v) as keyof typeof statuses] ?? str(v);
      return t.sheet.location(
        [status(a.status), str(a.name)].filter(Boolean).join(" · "),
      );
    }
    case "sheet.ready":
      return a.ready ? t.sheet.ready : t.sheet.notReady;
    case "shoot.status":
      return t.shoot(
        isShootState(str(a.status))
          ? fr.productionShoot.state.labels[str(a.status) as never]
          : str(a.status),
      );
    case "export.link":
      return t.export.link(str(a.label));
    case "export.created":
      return t.export.created(str(a.label));
    case "export.removed":
      return t.export.removed(str(b.label));
    case "export.spec":
      return t.export.spec(str(a.label), str(a.spec) || "—");
    case "handoff.sent":
      return t.handoff(a.recipient ? names.person(a.recipient) : null);
    case "sheet.closed":
      return t.closed;
    case "export.result":
      return a.result === "ok"
        ? t.export.ok(str(a.label))
        : a.result === "not_ok"
          ? t.export.notOk(str(a.label))
          : t.export.reset(str(a.label));
    case "step.created":
    case "step.removed": {
      const v = e.action === "created" ? a : b;
      const label = stepLabel({
        key: postStepKeyOf(v.key) ?? "other",
        label: str(v.label) || null,
      });
      return e.action === "created"
        ? t.stepCreated(label)
        : t.stepRemoved(label);
    }
    case "step.holder":
    case "step.status": {
      const key = postStepKeyOf(a.key) ?? "other";
      const label = stepLabel({ key, label: str(a.label) || null });
      if (e.action === "holder")
        return t.step.holder(
          label,
          change(names.holder(b.holder), names.holder(a.holder)),
        );
      const statuses = fr.productionPost.steps.statuses;
      return t.step.status(
        label,
        statuses[str(a.status) as keyof typeof statuses] ?? str(a.status),
      );
    }
    case "place.created":
      return t.place.created(str(a.name));
    case "place.status": {
      const name = str(a.name);
      const reason = a.reason ? ` · ${t.note(str(a.reason))}` : "";
      if (a.status !== b.status) {
        if (a.status === "chosen") return t.place.chosen(name) + reason;
        if (a.status === "discarded") return t.place.discarded(name) + reason;
        return t.place.restored(name);
      }
      return a.verification === "verified"
        ? t.place.verified(name)
        : t.place.unverified(name);
    }
    case "callsheet.published":
      return t.callSheet(num(a.number));
    case "link.sent":
      return t.link(names.holder(a.holder));
    case "link.revoked":
      return t.linkRevoked(
        names.holder({ kind: "contact", id: str(a.contact) }),
      );
    case "sheet.organized":
      // Same organisation and company before and after: a role changed.
      if (
        b.organization === a.organization &&
        (b.company ?? null) === (a.company ?? null)
      )
        return t.roles;
      return t.organized(
        a.organization === "internal" || a.organization === "external"
          ? a.organization
          : null,
        a.company ? names.holder({ kind: "contact", id: a.company }) : null,
      );
    case "direction.deposited":
      return t.proposal.deposited(num(a.number));
    case "direction.decided":
      return t.proposal.decided(
        num(a.number),
        a.side === "ext" ? "ext" : "int",
        a.status === "approved",
      );
    case "direction.version_requested":
      return t.proposal.requested(str(a.reason));
    case "sheet.creative_ext":
      return t.creativeExt;
    case "sheet.schedule":
      return t.schedule(
        `${day(a.date)}, ${str(a.start).slice(0, 5)} – ${str(a.end).slice(0, 5)}`,
        !e.before,
      );
    case "sheet.derived":
      return t.derived;
    case "delivery.final_linked":
      return t.finalLinked;
    case "delivery.decision": {
      if (a.delivered && !b.delivered) return t.delivery.delivered;
      if (a.checked && !b.checked) return t.delivery.checked;
      if (a.approved && !b.approved) return t.delivery.approved;
      return t.delivery.reopened;
    }
    default:
      return "";
  }
}

/** Sentences without an actor: what the database or a provider did. */
export const actorless = (e: HistoryEvent) =>
  (e.entity === "request" && e.after?.status === "treated") ||
  (e.entity === "sheet" && e.action === "ready" && !e.after?.ready) ||
  (e.entity === "export" && e.action === "result" && !e.after?.result) ||
  e.entity === "shoot" ||
  (e.entity === "delivery" && e.action === "final_linked") ||
  (e.entity === "step" && e.action === "status") ||
  (e.entity === "delivery" &&
    !(
      (e.after?.delivered && !e.before?.delivered) ||
      (e.after?.checked && !e.before?.checked)
    ));
