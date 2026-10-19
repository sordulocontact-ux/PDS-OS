// The manual deposit and the distributor's answers (ticket « Distribution »
// § 7, CA08-CA09): each state reads only its own declarations — a declared
// deposit is not a reception, a reception is not an acceptance, an
// acceptance is not a delivery to the platforms. Grouped by cycle (the
// dossier version deposited). Pure.

export const DECLARATION_KINDS = [
  "deposit",
  "received",
  "corrections_requested",
  "accepted",
  "platforms_delivered",
  // « Disponibilité publique déclarée », said on the Plateformes step.
  "available",
] as const;
export type DeclarationKind = (typeof DECLARATION_KINDS)[number];

export const isDeclarationKind = (value: string): value is DeclarationKind =>
  (DECLARATION_KINDS as readonly string[]).includes(value);

export type Declaration = {
  id: string;
  version: number;
  kind: DeclarationKind;
  declaredOn: string | null;
  orchardId: string | null;
  note: string | null;
  // A file of distribution-proofs (signed URL, short-lived) or a link.
  proof: { name: string; href: string | null } | null;
  proofUrl: string | null;
  declaredBy: string | null;
  declaredAt: string;
  withdrawn: { at: string; by: string | null; note: string | null } | null;
};

// declared: said by a person, nothing attached; proven: said with a file or
// a link attached. Neither is « vérifié » (§ 12).
export type Evidence = "declared" | "proven";

export const evidenceOf = (declaration: Declaration): Evidence =>
  declaration.proof || declaration.proofUrl ? "proven" : "declared";

export type CycleState = {
  version: number;
  deposit: Declaration | null;
  received: Declaration | null;
  // The latest of « corrections demandées » and « accepté », if any.
  outcome: Declaration | null;
  delivered: Declaration | null;
  available: Declaration | null;
};

const active = (d: Declaration) => d.withdrawn === null;

/** The state of one cycle, from its active declarations only. */
export function cycleState(
  declarations: Declaration[],
  version: number,
): CycleState {
  const own = declarations.filter((d) => d.version === version && active(d));
  const latest = (kinds: DeclarationKind[]) =>
    own
      .filter((d) => kinds.includes(d.kind))
      .sort((a, b) => b.declaredAt.localeCompare(a.declaredAt))[0] ?? null;
  return {
    version,
    deposit: latest(["deposit"]),
    received: latest(["received"]),
    outcome: latest(["corrections_requested", "accepted"]),
    delivered: latest(["platforms_delivered"]),
    available: latest(["available"]),
  };
}

/** What the owner may declare next in a cycle (the database refuses the
 * rest): the deposit first, then each answer once. */
export function declarable(state: CycleState): DeclarationKind[] {
  if (!state.deposit) return ["deposit"];
  return [
    ...(state.received ? [] : (["received"] as const)),
    ...(state.outcome?.kind === "corrections_requested"
      ? (["accepted"] as const)
      : state.outcome
        ? []
        : (["corrections_requested", "accepted"] as const)),
    ...(state.delivered ? [] : (["platforms_delivered"] as const)),
  ];
}

/** Every cycle, newest first, with its declarations (withdrawn included). */
export function cycles(
  declarations: Declaration[],
): Array<{ version: number; declarations: Declaration[] }> {
  const versions = [...new Set(declarations.map((d) => d.version))].sort(
    (a, b) => b - a,
  );
  return versions.map((version) => ({
    version,
    declarations: declarations
      .filter((d) => d.version === version)
      .sort((a, b) => b.declaredAt.localeCompare(a.declaredAt)),
  }));
}

/** What The Orchard answers after a deposit, in the order of the frieze
 * (an order of the screen only: nothing is deduced, § 7). */
export const ORCHARD_ANSWERS = [
  "received",
  "accepted",
  "platforms_delivered",
] as const;
export type OrchardAnswer = (typeof ORCHARD_ANSWERS)[number];
