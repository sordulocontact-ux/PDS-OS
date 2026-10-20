// The Master as a journey of five steps (docs/VISION-UX.md § 4, proto
// `master-v2.html`): Source, Brief, Mixage, Mastering, Master final. Pure:
// every state comes from what people and engineers recorded, never from PO
// (CLAUDE.md, rule 6). Several titles: each step is done when every title
// of the round is; the first title still waiting names the action.

import { fr } from "@/lib/i18n/fr";
import type {
  JourneyActor,
  JourneyPrereq,
  JourneyStep,
} from "@/lib/ui/journey";
import {
  MASTER_STEP_KEYS,
  masterStepHref,
  type MasterStepKey,
} from "@/lib/ui/master-steps";
import { formatDay, formatShortDay } from "@/lib/utils/day";

import type { JourneyTransmission, MasterJourneyFacts } from "./journey-facts";
import { invoiceDueOn } from "@/lib/invoices/rules";
import { newerThan, replacedForVocals, vocalsAwaited } from "./source-rules";

const t = fr.masterJourney;

// The masters themselves are the workflow's own results, not deliverables
// to receive.
const RESULTS = ["mix_final", "master_final"];

export type MasterJourneyInput = {
  projectId: string;
  facts: MasterJourneyFacts;
  viewerId: string | null;
  owner: { personId: string; name: string } | null;
  // Who pays the engineers' invoices (the direction), when one waits.
  direction?: { personId: string; name: string } | null;
  // The Cadrage's Brief validated (« Équipe et temporalité »).
  framingValidatedAt: string | null;
  now: Date;
};

export type MasterJourneyStep = Omit<JourneyStep, "key" | "prereq" | "next"> & {
  key: MasterStepKey;
  prereq: MasterStepKey[];
  next: MasterStepKey[];
};

type Stage = "mix" | "mastering";
type Who = { name: string; personId?: string | null; viaLink?: boolean };
type Action = { who: Who; todo: string; kind?: "do" | "validate" };

const firstName = (name: string) => name.split(" ")[0] ?? name;

/** The title has its master final in the Catalogue. */
const isFinal = (audio: MasterJourneyFacts["titles"][number]["audio"]) =>
  audio.some((a) => a.audioState === "final_master");

/** The live link of a round: the newest one, unless replaced. */
export function liveTransmission(
  facts: MasterJourneyFacts,
  stage: Stage,
): JourneyTransmission | null {
  return facts.transmissions.find((x) => x.role === stage) ?? null;
}

export function masterJourney(input: MasterJourneyInput): MasterJourneyStep[] {
  const { facts, viewerId, owner, now } = input;
  const versionsOf = (masterId: string, stage: Stage) =>
    facts.versions.filter((v) => v.masterId === masterId && v.stage === stage);
  const approved = (masterId: string, stage: Stage) =>
    versionsOf(masterId, stage).find((v) => v.decision === "approved") ?? null;

  // Titles of the round: the ones already at their master final before the
  // workflow (no source, no version) are left out, nothing to mix.
  const inFlow = facts.titles.filter(
    (title) =>
      !(
        isFinal(title.audio) &&
        title.sources.length === 0 &&
        facts.versions.every((v) => v.masterId !== title.id)
      ),
  );
  const several = inFlow.length > 1;
  const titleOf = (id: string) =>
    several ? (inFlow.find((x) => x.id === id)?.title ?? null) : null;

  const ownerWho: Who | null = owner
    ? { name: owner.name, personId: owner.personId }
    : null;
  const validatorWho: Who | null = facts.brief?.validatorId
    ? {
        name: facts.brief.validatorName ?? "—",
        personId: facts.brief.validatorId,
      }
    : ownerWho;
  const engineerOf = (stage: Stage) =>
    stage === "mix" || facts.brief?.masteringSame
      ? (facts.brief?.mixContact ?? null)
      : (facts.brief?.masteringContact ?? null);
  // The in-house engineer of a round (a member: no link, no invoice).
  const inHouseOf = (stage: Stage) => {
    const b = facts.brief;
    const same = stage === "mix" || b?.masteringSame;
    const person = same ? b?.mixPerson : b?.masteringPerson;
    return person
      ? {
          ...person,
          assignedAt:
            (stage === "mix" ? b?.mixAssignedAt : b?.masteringAssignedAt) ??
            null,
        }
      : null;
  };

  const actorOf = (actions: Action[]): JourneyActor | null => {
    const mine = actions.find(
      (a) => a.who.personId && a.who.personId === viewerId,
    );
    const a = mine ?? actions[0];
    return a
      ? {
          name: a.who.name,
          viewer: Boolean(a.who.personId && a.who.personId === viewerId),
          viaLink: a.who.viaLink ?? false,
          todo: a.todo,
          kind: a.kind ?? "do",
        }
      : null;
  };
  const ownerDoes = (todo: string): Action[] =>
    ownerWho ? [{ who: ownerWho, todo }] : [];

  // --- Source --------------------------------------------------------------
  const confirmed = (id: string) =>
    (inFlow.find((x) => x.id === id)?.sources.length ?? 0) > 0 ||
    approved(id, "mix") !== null;
  const toConfirm = inFlow.filter((x) => !confirmed(x.id));
  const sourceConfirmed = inFlow.length > 0 && toConfirm.length === 0;
  // Confirmed on a working version: the final vocals are awaited (the
  // artist records them), then a newer version asks to replace the source.
  const awaited = inFlow.filter(
    (x) => !approved(x.id, "mix") && vocalsAwaited(x.sources[0] ?? null),
  );
  const arrived = awaited.filter((x) => newerThan(x.audio, x.sources[0]));
  const sourceActions: Action[] =
    toConfirm.length > 0
      ? ownerDoes(t.todo.confirmSource(toConfirm.length))
      : arrived.length > 0
        ? ownerDoes(t.todo.replaceSource)
        : awaited.length > 0
          ? [
              {
                who: { name: awaited[0].artists || "—" },
                todo: t.todo.recordVocals(
                  awaited[0].sources[0]?.vocalsPending ?? null,
                ),
              },
            ]
          : [];
  const waitForVocals = awaited.some((x) => x.sources[0]?.plan === "wait");
  const allDeclared =
    inFlow.length > 0 &&
    inFlow.every((x) => approved(x.id, "mix")?.declared ?? false);
  const sourceSummary =
    facts.titles.length === 0
      ? t.summary.noTitle
      : inFlow.length === 0
        ? t.summary.allFinal
        : several
          ? t.summary.sources(inFlow.length)
          : allDeclared
            ? t.summary.existingMix(
                approved(inFlow[0].id, "mix")?.fileName ?? "",
              )
            : t.summary.source(
                inFlow[0].sources[0]?.fileName ?? "",
                replacedForVocals(inFlow[0].sources),
              );

  // --- Brief ---------------------------------------------------------------
  const brief = facts.brief;
  const briefDone = brief?.recordedAt != null;
  const pendingQuestion = facts.questions.find((q) => !q.answeredAt);
  const answered = facts.questions.find((q) => q.answeredAt && !q.appliedAt);
  const planned = facts.exchanges.find(
    (e) => e.status === "planned" && Date.parse(e.occurredAt) > now.getTime(),
  );
  const briefMissing =
    !brief?.mixContact ||
    (!brief.masteringSame && !brief.masteringContact) ||
    !brief.hasDirection;
  const briefActions: Action[] = pendingQuestion
    ? [
        {
          who: {
            name: pendingQuestion.askedToName ?? "—",
            personId: pendingQuestion.askedTo,
          },
          todo: t.todo.answerQuestion,
        },
      ]
    : answered
      ? ownerDoes(t.todo.applyAnswer)
      : planned
        ? ownerDoes(t.todo.callHeld(formatShortDay(planned.occurredAt)))
        : !brief?.startMode && !briefDone && facts.questions.length === 0
          ? ownerDoes(t.todo.startBrief)
          : briefMissing
            ? ownerDoes(t.todo.completeBrief)
            : ownerDoes(t.todo.recordBrief);

  // --- Mixage and Mastering --------------------------------------------------
  const roundActions = (stage: Stage): Action[] => {
    const label = t.versionLabel[stage];
    const inHouse = inHouseOf(stage);
    const engineer = engineerOf(stage) ?? inHouse;
    if (!engineer) return ownerDoes(t.todo.chooseEngineer(stage));
    const link = inHouse ? null : liveTransmission(facts, stage);
    if (inHouse && !inHouse.assignedAt)
      return ownerDoes(fr.masterInHouse.todo.assign(inHouse.name));
    if (!inHouse && !link) return ownerDoes(t.todo.transmit(stage));
    const actions: Action[] = [];
    const ext: Who = inHouse
      ? { name: inHouse.name, personId: inHouse.personId }
      : { name: engineer.name, viaLink: true };
    const expired =
      link !== null &&
      Date.parse(link.expiresAt) < now.getTime() &&
      !link.acknowledgedAt;
    if (link && ((link.revokedAt && link.revokeReason) || expired))
      actions.push(...ownerDoes(t.todo.renewLink));
    else if (link && !link.acknowledgedAt)
      actions.push({ who: ext, todo: t.todo.takeCharge });
    else
      for (const title of inFlow) {
        if (approved(title.id, stage)) continue;
        if (stage === "mastering" && !approved(title.id, "mix")) continue;
        const [last] = versionsOf(title.id, stage);
        if (
          !last ||
          last.decision === "changes_requested" ||
          last.decision === "reopened"
        )
          actions.push({
            who: ext,
            todo: t.todo.deposit(
              label,
              (last?.number ?? 0) + 1,
              titleOf(title.id),
            ),
          });
        else if (!last.decision && validatorWho)
          actions.push({
            who: validatorWho,
            todo: t.todo.validate(label, last.number, titleOf(title.id)),
            kind: "validate",
          });
      }
    const open = facts.messages.filter(
      (m) => m.stage === stage && m.status === "open",
    ).length;
    if (open > 0)
      actions.push(
        ...ownerDoes(t.todo.answerEngineer(firstName(engineer.name), open)),
      );
    // A delay sent to the direction: it decides (proto `master:thread`).
    if (
      input.direction &&
      facts.messages.some((m) => m.stage === stage && m.status === "escalated")
    )
      actions.push({
        who: {
          name: input.direction.name,
          personId: input.direction.personId,
        },
        todo: t.todo.arbitrateDelay(firstName(engineer.name)),
        kind: "validate",
      });
    if (facts.rates.some((r) => r.stage === stage && r.status === "proposed"))
      actions.push(...ownerDoes(t.todo.acceptRate(firstName(engineer.name))));
    return actions;
  };
  const roundDone = (stage: Stage) =>
    inFlow.length > 0 && inFlow.every((x) => approved(x.id, stage) !== null);
  const roundSummary = (stage: Stage) => {
    if (stage === "mix" && allDeclared) return t.summary.mixNotNeeded;
    if (several)
      return stage === "mix"
        ? t.summary.mixFinals(inFlow.length)
        : t.summary.masterFinals(inFlow.length);
    const n = inFlow[0] ? (approved(inFlow[0].id, stage)?.number ?? 0) : 0;
    return stage === "mix" ? t.summary.mixFinal(n) : t.summary.masterFinal(n);
  };

  // --- Master final ----------------------------------------------------------
  const expected = (facts.brief?.deliverables ?? []).filter(
    (d) => !RESULTS.includes(d),
  );
  const missingDeliverables = inFlow.reduce(
    (sum, title) =>
      sum +
      expected.filter(
        (d) =>
          !facts.received.some(
            (r) => r.masterId === title.id && r.deliverable === d,
          ),
      ).length,
    0,
  );
  // The invoices: a new RIB to confirm, then the transfer to note, by the
  // direction. Never a blocker: the step stays done (proto).
  const ti = fr.masterInvoice;
  const directionWho: Who | null = input.direction
    ? { name: input.direction.name, personId: input.direction.personId }
    : null;
  const invoiceActions: Action[] = directionWho
    ? facts.invoices.flatMap((i) =>
        !i.receivedAt || i.paidOn
          ? []
          : [
              {
                who: directionWho,
                todo: i.bankPending
                  ? ti.todo.confirmRib(i.contactName)
                  : ti.todo.pay(
                      i.contactName,
                      formatDay(invoiceDueOn(i.receivedAt)),
                    ),
              },
            ],
      )
    : [];
  const finalActions: Action[] = [
    // The mastering engineer deposits them on their link (proto); without
    // one, the owner notes them received.
    ...(missingDeliverables > 0
      ? engineerOf("mastering")
        ? [
            {
              who: { name: engineerOf("mastering")!.name, viaLink: true },
              todo: t.todo.depositDeliverables(missingDeliverables),
            },
          ]
        : ownerDoes(t.todo.noteDeliverables(missingDeliverables))
      : []),
    ...invoiceActions,
  ];
  const invoiceSummary =
    facts.invoices.length === 0
      ? null
      : facts.invoices.some((i) => i.receivedAt && !i.paidOn)
        ? ti.summary.toPay
        : facts.invoices.some((i) => !i.receivedAt)
          ? ti.summary.expected
          : ti.summary.paid;

  // --- The steps ---------------------------------------------------------------
  const nothingToDo = facts.titles.length > 0 && inFlow.length === 0;
  const doneOf: Record<MasterStepKey, boolean> = {
    source: nothingToDo || (sourceConfirmed && sourceActions.length === 0),
    brief: nothingToDo || briefDone,
    mix: nothingToDo || roundDone("mix"),
    mastering: nothingToDo || roundDone("mastering"),
    final: nothingToDo || (roundDone("mastering") && missingDeliverables === 0),
  };
  const actionsOf: Record<MasterStepKey, Action[]> = {
    source: sourceActions,
    brief: briefActions,
    mix: roundActions("mix"),
    mastering: roundActions("mastering"),
    final: finalActions,
  };
  const summaryOf: Record<MasterStepKey, string> = {
    source: sourceSummary,
    brief: brief?.dirty ? t.summary.briefDirty : t.summary.brief,
    mix: nothingToDo ? t.summary.allFinal : roundSummary("mix"),
    mastering: nothingToDo ? t.summary.allFinal : roundSummary("mastering"),
    final: [t.summary.final, invoiceSummary].filter(Boolean).join(" · "),
  };
  const day = (value: string | null) => (value ? formatShortDay(value) : null);
  const externalOf: Record<MasterStepKey, JourneyPrereq[]> = {
    source: [
      {
        key: "plan",
        label: t.prereq.plan,
        done: true,
        source: t.prereq.planSource(day(facts.planLaunchedAt)),
      },
    ],
    brief: [
      {
        key: "source-confirmed",
        label: t.prereq.sourceConfirmed,
        done: sourceConfirmed || nothingToDo,
      },
      {
        key: "team",
        label: t.prereq.team,
        module: fr.shell.project.sidebar.framing,
        done: input.framingValidatedAt !== null,
        source: t.prereq.teamSource(day(input.framingValidatedAt)),
      },
    ],
    mix: waitForVocals
      ? [{ key: "vocals", label: t.prereq.vocals, done: false }]
      : [],
    mastering: [],
    final: [],
  };
  const PREREQ: Record<MasterStepKey, MasterStepKey[]> = {
    source: [],
    brief: [],
    mix: ["brief"],
    mastering: ["mix"],
    final: ["mastering"],
  };
  const NEXT: Record<MasterStepKey, MasterStepKey[]> = {
    source: ["brief"],
    brief: ["mix"],
    mix: ["mastering"],
    mastering: ["final"],
    final: [],
  };
  const masterFinalDue = facts.brief?.masterFinalDue ?? null;
  const ownerRole = owner ? { name: owner.name, role: t.owner } : null;
  const validatorRole =
    validatorWho && facts.brief?.validatorId
      ? { name: validatorWho.name, role: t.validatorRole.brief }
      : validatorWho
        ? { name: validatorWho.name, role: t.validatorRole.owner }
        : null;

  // Someone outside PDS acts now (an engineer by link, the artist).
  const isOutside = (actions: Action[], actor: JourneyActor) => {
    const who = actions.find(
      (a) => a.who.name === actor.name && a.todo === actor.todo,
    )?.who;
    return Boolean(who && (who.viaLink || !who.personId));
  };
  const status = new Map<MasterStepKey, JourneyStep["status"]>();
  return MASTER_STEP_KEYS.map((key) => {
    const ready =
      PREREQ[key].every((p) => status.get(p) === "done") &&
      // « Source confirmée », not the Source step done: anticipating with a
      // working version opens the Brief.
      (key !== "brief" || sourceConfirmed || nothingToDo) &&
      // Waiting for the final vocals keeps the Mixage closed.
      (key !== "mix" || !waitForVocals);
    const actor = actorOf(actionsOf[key]);
    const st: JourneyStep["status"] = doneOf[key]
      ? "done"
      : !ready
        ? "blocked"
        : actor && !actor.viewer && isOutside(actionsOf[key], actor)
          ? "waiting"
          : "current";
    status.set(key, st);
    const open = st === "current" || st === "waiting";
    return {
      key,
      href: masterStepHref(input.projectId, key),
      title: t.steps[key].title,
      why: t.steps[key].why,
      status: st,
      owner: ownerRole,
      validator: key === "mix" || key === "mastering" ? validatorRole : null,
      prereq: PREREQ[key],
      external: externalOf[key],
      next: NEXT[key],
      nextExternal:
        key === "final"
          ? [
              {
                key: "distribution",
                label: `${t.next.distribution} · ${t.next.distributionWhy(
                  masterFinalDue ? formatDay(masterFinalDue) : null,
                )}`,
              },
              { key: "legal", label: `${t.next.legal} · ${t.next.legalWhy}` },
            ]
          : undefined,
      // A done Master final still names who pays an invoice (proto).
      actor:
        open ||
        (key === "final" && invoiceActions.length > 0) ||
        ((key === "mix" || key === "mastering") &&
          input.direction &&
          facts.messages.some(
            (m) => m.stage === key && m.status === "escalated",
          ))
          ? actor
          : null,
      summary: summaryOf[key],
    };
  });
}
