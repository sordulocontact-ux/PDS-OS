// Who an activation waits for, beyond its trunk (proto actorsMk): one line
// per collaboration of an influence campaign (the creator acts on her
// private link), the agency's file, the press module's framing, kit,
// template, messages, interviews and coverage. Each line names its person:
// the activation's owner, the direction (decisions, `kind: "validate"`), the
// creative lead (contents) or a contact through her link. Pure.

import type { CollabView } from "@/lib/activations/campaign";
import type { ActionPerson, ActivationAction } from "@/lib/activations/journey";
import type { ModuleFacts } from "@/lib/activations/module-facts";
import type { EvidenceRecord } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationJourney;

export type ModulePeople = {
  owner: ActionPerson;
  direction: ActionPerson;
  // Validates the creators' contents (proto: the creative director).
  creative: ActionPerson;
};

type Activation = {
  id: string;
  kind: string;
  mode: string | null;
  status: string;
};

const line = (
  key: string,
  who: ActionPerson,
  todo: string,
  anchor: string,
  kind: "do" | "validate" = "do",
): ActivationAction => ({ key, who, todo, kind, anchor });

const contact = (name: string): ActionPerson => ({
  personId: null,
  name,
  viaLink: true,
  viewer: false,
});

/** A collaboration's next gesture and who does it (proto collabNext). */
export function collabAction(
  c: CollabView,
  p: ModulePeople,
): ActivationAction | null {
  const k = `collab:${c.targetId}`;
  const a = `collab-${c.targetId}`;
  const of = (todo: string) => t.collab.of(todo, c.name);
  const c_ = t.collab;
  switch (c.stage) {
    case "candidate":
      return line(k, p.owner, of(c_.concept), a);
    case "concept_to_validate":
      return line(k, p.direction, of(c_.conceptDecision), a, "validate");
    case "validated_internal":
      return line(k, p.owner, of(c_.brief), a);
    case "to_contact":
      return c.briefStatus === "to_validate"
        ? line(k, p.direction, of(c_.briefValidate), a, "validate")
        : line(
            k,
            p.owner,
            of(c.briefStatus === "validated" ? c_.briefSend : c_.brief),
            a,
          );
    case "negotiation":
      return line(
        k,
        p.owner,
        of(c.creatorSpokeLast ? c_.counter : c_.terms),
        a,
      );
    case "agreement_to_obtain":
      return c.agreementPending
        ? line(k, contact(c.name), c_.agree, a)
        : line(k, p.owner, of(c_.prepareLink), a);
    case "agreed":
    case "content_in_progress":
      return line(k, contact(c.name), c_.content, a);
    case "in_validation":
      return line(k, p.creative, of(c_.contentDecision), a, "validate");
    case "ready_to_publish":
      return line(k, contact(c.name), c_.publish, a);
    case "published_declared":
      return line(k, p.direction, of(c_.verifyPublication), a, "validate");
    case "published_verified":
      return c.paymentStatus === "paid_verified"
        ? line(k, p.owner, of(c_.closeCollab), a)
        : line(k, p.owner, of(c_.askInvoice), a);
    case "administration":
      switch (c.paymentStatus) {
        case "document_expected":
          return line(k, contact(c.name), c_.invoice, a);
        case "to_validate":
          return line(k, p.direction, of(c_.approvePayment), a, "validate");
        case "ready_to_pay":
          return line(k, p.owner, of(c_.declarePayment), a);
        case "paid_declared":
          return line(k, p.direction, of(c_.verifyPayment), a, "validate");
        default:
          return line(k, p.owner, of(c_.askInvoice), a);
      }
    default:
      return null;
  }
}

/** The agency's file (proto agNext), and for RP the transmission. */
function agencyActions(
  a: Activation,
  m: ModuleFacts,
  p: ModulePeople,
  framingValidated: boolean,
  kitApproved: boolean,
): ActivationAction[] {
  const out: ActivationAction[] = [];
  const press = a.kind === "press";
  const mine = <T extends { activation_id: string }>(list: T[]) =>
    list.filter((x) => x.activation_id === a.id);
  if (
    press &&
    framingValidated &&
    kitApproved &&
    mine(m.transmissions).length === 0
  )
    out.push(line("agency:transmit", p.owner, t.agency.transmit, "transmit"));
  const sources = mine(m.sources);
  if (sources.length === 0) {
    out.push(line("agency:link", p.owner, t.agency.link, "agency"));
    return out;
  }
  if (sources.some((s) => s.key_fields.length === 0))
    out.push(line("agency:mapping", p.owner, t.agency.mapping, "agency"));
  if (mine(m.snapshots).length > 0)
    out.push(line("agency:preview", p.owner, t.agency.preview, "agency"));
  const rows = mine(m.rows).filter((r) => !r.absent_since);
  const pending = rows.filter((r) => r.pds_decision === "to_review").length;
  if (pending > 0)
    out.push(
      line("agency:decide", p.owner, t.agency.decide(pending, press), "agency"),
    );
  const lastRecap = mine(m.messages)
    .filter((x) => x.kind === "agency_recap" && x.sent_declared_at)
    .map((x) => x.sent_declared_at as string)
    .sort()
    .at(-1);
  const unsent = rows.some(
    (r) =>
      r.decided_at &&
      r.pds_decision !== "to_review" &&
      (!lastRecap || r.decided_at > lastRecap),
  );
  if (unsent) {
    const agency =
      sources.find((s) => s.agency_person)?.agency_person ??
      t.agency.recapAgency;
    out.push(line("agency:recap", p.owner, t.agency.recap(agency), "agency"));
  }
  if (mine(m.reports).some((r) => r.status === "received"))
    out.push(
      line("agency:report", p.direction, t.agency.report, "report", "validate"),
    );
  return out;
}

const MESSAGE_KINDS = ["pitch", "follow_up", "other"];

/** RP in house and RP's framing (proto rpNext). */
function pressActions(
  a: Activation,
  m: ModuleFacts,
  p: ModulePeople,
  evidences: EvidenceRecord[],
  kit: { approved: boolean; state: string | null },
): ActivationAction[] {
  const out: ActivationAction[] = [];
  const r = t.press;
  const framing = m.sheets.find(
    (s) => s.activation_id === a.id && s.kind === "framing",
  );
  if (!framing || ["draft", "changes_requested"].includes(framing.status))
    out.push(line("press:framing", p.owner, r.framing, "framing"));
  else if (framing.status === "to_validate")
    out.push(
      line(
        "press:framing",
        p.direction,
        r.framingDecision,
        "framing",
        "validate",
      ),
    );
  const framed = framing?.status === "validated";
  if (framed && !kit.approved)
    out.push(
      kit.state === "sent"
        ? line("press:kit", p.direction, r.kitDecision, "kit", "validate")
        : line("press:kit", p.owner, r.kit, "kit"),
    );
  if (a.mode !== "internal") return out;
  const messages = m.messages.filter((x) => x.activation_id === a.id);
  const template = messages
    .filter((x) => x.target_id === null && x.kind === "pitch")
    .at(-1);
  if (framed && (!template || template.status === "cancelled"))
    out.push(line("press:template", p.owner, r.template, "template"));
  else if (template?.status === "draft")
    out.push(line("press:template", p.owner, r.templateSubmit, "template"));
  else if (template?.status === "to_validate")
    out.push(
      line(
        "press:template",
        p.direction,
        r.templateDecision,
        "template",
        "validate",
      ),
    );
  const targets = m.targets.filter((x) => x.activation_id === a.id);
  const pitched = new Set(
    messages.flatMap((x) =>
      x.target_id && x.kind === "pitch" && x.status !== "cancelled"
        ? [x.target_id]
        : [],
    ),
  );
  if (
    template?.status === "validated" &&
    targets.some((x) => !x.outcome && !pitched.has(x.id))
  )
    out.push(line("press:drafts", p.owner, r.drafts, "template"));
  for (const x of targets) {
    const anchor = `media-${x.id}`;
    const last = messages
      .filter(
        (msg) => msg.target_id === x.id && MESSAGE_KINDS.includes(msg.kind),
      )
      .at(-1);
    if (last?.status === "draft")
      out.push(line(`press:msg:${x.id}`, p.owner, r.submit(x.name), anchor));
    else if (last?.status === "to_validate")
      out.push(
        line(
          `press:msg:${x.id}`,
          p.direction,
          r.validate(x.name),
          anchor,
          "validate",
        ),
      );
    else if (last?.status === "validated")
      out.push(line(`press:msg:${x.id}`, p.owner, r.send(x.name), anchor));
    for (const o of m.opportunities.filter((o) => o.target_id === x.id)) {
      const todo =
        o.status === "proposed"
          ? r.availability(x.name)
          : o.status === "availability"
            ? r.slot(x.name)
            : o.status === "confirmed"
              ? r.done(x.name)
              : o.status === "done"
                ? r.broadcast(x.name)
                : null;
      if (todo) out.push(line(`press:opp:${o.id}`, p.owner, todo, anchor));
    }
  }
  const unverified = evidences.filter(
    (e) =>
      e.activationId === a.id &&
      e.targetId !== null &&
      e.kind === "coverage" &&
      e.withdrawnAt === null &&
      e.checks.length === 0,
  ).length;
  if (unverified > 0)
    out.push(
      line(
        "press:coverage",
        p.direction,
        r.coverage(unverified),
        "coverage",
        "validate",
      ),
    );
  return out;
}

/** Every module line of an activation that is still live. */
export function moduleActions(
  a: Activation,
  input: {
    m: ModuleFacts;
    evidences: EvidenceRecord[];
    collabs: CollabView[];
    people: ModulePeople;
    kit: { approved: boolean; state: string | null };
  },
): ActivationAction[] {
  if (["closed", "cancelled", "suspended"].includes(a.status)) return [];
  const { m, evidences, collabs, people, kit } = input;
  if (a.kind === "influence" && a.mode === "internal")
    return collabs.flatMap((c) => collabAction(c, people) ?? []);
  if (a.kind !== "influence" && a.kind !== "press") return [];
  const framingValidated = m.sheets.some(
    (s) =>
      s.activation_id === a.id &&
      s.kind === "framing" &&
      s.status === "validated",
  );
  const press =
    a.kind === "press" ? pressActions(a, m, people, evidences, kit) : [];
  const agency =
    a.mode === "agency"
      ? agencyActions(a, m, people, framingValidated, kit.approved)
      : [];
  return [...press, ...agency];
}
