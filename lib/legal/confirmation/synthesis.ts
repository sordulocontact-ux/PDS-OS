// The dossier PO reformulates before confirmation (ticket Juridique 01:
// « PO reformule le dossier, montre les corrections possibles et demande
// confirmation »). Written by code from what the catalog holds and what the
// answers declared, never by the model (CLAUDE.md, rule 6), so each line is
// explained by its source and status. Pure.

import { routes } from "@/lib/auth/redirects";
import { contractStateOf } from "@/lib/contracts/types";
import { groupOf, type Fact, type FactStatus } from "@/lib/facts/types";
import { fr } from "@/lib/i18n/fr";
import type { InventoryRows } from "@/lib/legal/inventory-rows";
import { factLabel } from "@/lib/legal/intake/labels";
import type {
  FactValue,
  IntakeQuestion,
  QuestionKey,
} from "@/lib/legal/intake/types";
import type { InventoryMaster } from "@/lib/legal/title-facts";

/** A row's link back to the conversation: answer it, or correct it. */
export type SynthesisAction = { kind: "answer" | "correct"; href: string };
export type SynthesisFact = Fact<SynthesisAction>;

export const SYNTHESIS_SECTION_KEYS = [
  "people",
  "third_party",
  "agreements",
  "publishers",
] as const;
export type SynthesisSectionKey = (typeof SYNTHESIS_SECTION_KEYS)[number];
export type SynthesisSection = {
  key: SynthesisSectionKey;
  facts: SynthesisFact[];
};

/** An active fact of the answers, with its stored status. */
export type AnswerFact = {
  question: QuestionKey;
  masterId: string | null;
  fact: FactValue;
  // legal_facts.status: the ticket's seven statuses.
  status: string;
};

const t = fr.legal.confirmation;

// The ticket's statuses, grouped in the three levels of the screen.
const ANSWER_STATUS: Record<string, FactStatus> = {
  known: "known",
  confirmed: "known",
  declared: "to_confirm",
  deduced: "to_confirm",
  to_verify: "to_confirm",
  simulated: "to_confirm",
  missing: "missing",
};

export function questionHref(
  projectId: string,
  question: QuestionKey,
  masterId: string | null,
): string {
  return `${routes.projectLegalStep(projectId, "framing")}?question=${question}:${
    masterId ?? "project"
  }`;
}

type Build = {
  projectId: string;
  rows: InventoryRows;
  questions: IntakeQuestion[];
  answers: AnswerFact[];
  today: string;
};

export function buildSynthesis(b: Build): SynthesisSection[] {
  const href = (q: QuestionKey, masterId: string | null) =>
    questionHref(b.projectId, q, masterId);
  const open = (q: QuestionKey, master: InventoryMaster | null) =>
    b.questions.some(
      (x) => x.key === q && x.masterId === (master?.id ?? null) && !x.answered,
    );
  const unanswered = (
    q: QuestionKey,
    master: InventoryMaster | null,
  ): SynthesisFact[] =>
    open(q, master)
      ? [
          {
            key: `open-${q}-${master?.id ?? "project"}`,
            label: fr.legal.intake.questions[q].short,
            detail: null,
            group: master ? groupOf(master) : undefined,
            source: t.sources.intake,
            status: "missing",
            statusLabel: t.states.unanswered,
            href: href(q, master?.id ?? null),
            action: { kind: "answer", href: href(q, master?.id ?? null) },
          },
        ]
      : [];
  const declared = (
    q: QuestionKey,
    master: InventoryMaster | null,
    keep: (fact: FactValue) => boolean = () => true,
  ): SynthesisFact[] =>
    b.answers
      .filter(
        (a) =>
          a.question === q &&
          a.masterId === (master?.id ?? null) &&
          keep(a.fact),
      )
      .map((a, index) => ({
        key: `answer-${q}-${master?.id ?? "project"}-${index}`,
        label: factLabel(a.fact, q),
        detail: null,
        group: master ? groupOf(master) : undefined,
        source: t.sources.intake,
        status: ANSWER_STATUS[a.status] ?? "to_confirm",
        statusLabel:
          t.states.answer[a.status as keyof typeof t.states.answer] ??
          t.states.answer.declared,
        href: href(q, master?.id ?? null),
        action: { kind: "correct", href: href(q, master?.id ?? null) },
      }));

  const people = b.rows.titles.flatMap((master): SynthesisFact[] => {
    const performers = b.rows.performersOf.get(master.id) ?? [];
    const credited = new Set(performers.map((p) => p.name.toLowerCase()));
    // One line per person and title, every role together.
    const byName = new Map<string, { name: string; roles: string[] }>();
    for (const c of b.rows.creditsOf.get(master.id) ?? []) {
      const key = c.name.trim().toLowerCase();
      const entry = byName.get(key) ?? { name: c.name, roles: [] };
      entry.roles.push(fr.masterPage.credits.roles[c.role]);
      byName.set(key, entry);
    }
    return [
      ...performers.map((p): SynthesisFact => ({
        key: `performer-${master.id}-${p.artistId}`,
        label: p.name,
        detail: p.featuring
          ? fr.legal.inventory.facts.featuring
          : fr.legal.inventory.facts.performer,
        group: groupOf(master),
        source: fr.legal.inventory.sources.artist,
        status: "known",
        statusLabel: t.states.credited,
        href: routes.artist(p.artistId),
      })),
      ...[...byName.values()].map((person, index): SynthesisFact => ({
        key: `credit-${master.id}-${index}`,
        label: person.name,
        detail: person.roles.join(" · "),
        group: groupOf(master),
        source: fr.legal.inventory.sources.credits,
        status: "known",
        statusLabel: t.states.credited,
        href: routes.masterCredits(master.id),
      })),
      // A performance declared in an answer stays a fact (the catalog keeps
      // performers on its artists): shown unless already credited.
      ...declared(
        "contributors",
        master,
        (f) =>
          f.kind === "contribution" &&
          f.value.role === "performer" &&
          !credited.has(f.value.name.toLowerCase()),
      ),
      ...unanswered("contributors", master),
    ];
  });

  const thirdParty = b.rows.titles.flatMap((master) => [
    ...declared("third_party", master),
    ...unanswered("third_party", master),
  ]);

  const agreements: SynthesisFact[] = [
    ...b.rows.contracts.map((c): SynthesisFact => {
      const state = contractStateOf(c, b.today);
      return {
        key: `contract-${c.id}`,
        label: c.title,
        detail: c.parties.length > 0 ? c.parties.join(", ") : null,
        source: fr.legal.inventory.sources.contracts,
        status: state === "signed" ? "known" : "to_confirm",
        statusLabel: fr.contracts.states[state],
        href: routes.contract(c.id),
      };
    }),
    ...declared("agreements", null),
    ...unanswered("agreements", null),
  ];

  const publishers = b.rows.titles.flatMap((master): SynthesisFact[] => [
    ...(b.rows.splitsOf.get(master.id) ?? [])
      .filter((s) => s.kind === "publishing" && s.role === "publisher")
      .map((s): SynthesisFact => ({
        key: `publisher-${s.id}`,
        label: s.party,
        detail: null,
        group: groupOf(master),
        source: fr.legal.inventory.sources.splits,
        status: "known",
        statusLabel: t.states.inSplit,
        href: routes.masterSplits(master.id),
      })),
    ...declared("publisher", master),
    ...unanswered("publisher", master),
  ]);

  return [
    { key: "people", facts: people },
    { key: "third_party", facts: thirdParty },
    { key: "agreements", facts: agreements },
    { key: "publishers", facts: publishers },
  ];
}
