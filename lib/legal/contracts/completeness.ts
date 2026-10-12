// The completeness checklist of a contract (JUR-16, docs/ARCHITECTURE.md
// § 8 sexies, « Complétude d'un contrat »): for every value its template
// asks, what state it is in, whether it blocks, who provides it. Decided by
// the code only (CLAUDE.md rule 6). Pure, client-safe.
//
//   filled          read at its source, nothing to do;
//   unconfirmed     taken from the Réseau, not given by the person's fiche:
//                   usable, to check (never blocking);
//   not_applicable  not asked for this person (a SIREN for someone acting as
//                   a person, an IPI without a collecting society): never
//                   blocking, the contract says « Sans objet »;
//   waiting         missing, and the person's fiche is sent, not back yet:
//                   it waits for them;
//   invalid         present but not in its format (an e-mail, a SIREN…):
//                   blocking until corrected at its source;
//   missing         nowhere yet: blocking.

import {
  FIELD_HOME,
  isContractField,
  type FieldSource,
} from "@/lib/legal/contracts/fields";

export type ValueStatus =
  | "filled"
  | "unconfirmed"
  | "not_applicable"
  | "waiting"
  | "invalid"
  | "missing";

/** Who provides a value: the person through their fiche, the project's
 * owner (Réseau, credits, mapping), the direction (the organization). */
export type ValueProvider = "person" | "owner" | "direction";

const BLOCKING: readonly ValueStatus[] = ["waiting", "invalid", "missing"];
export const isBlocking = (status: ValueStatus) => BLOCKING.includes(status);

const digits = (value: string) => value.replace(/[\s.-]/g, "");

/** The format a value must have, when it has one. */
export function isValidValue(id: string, value: string): boolean {
  switch (id) {
    case "personne.email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    case "personne.siret":
      return /^(\d{9}|\d{14})$/.test(digits(value));
    case "personne.ipi":
      return /^\d{9,11}$/.test(digits(value));
    case "personne.telephone":
      return digits(value).replace(/^\+/, "").length >= 8;
    default:
      return true;
  }
}

export function valueStatus(input: {
  id: string;
  value: string | null;
  source: FieldSource | null;
  // The value does not apply to this person (values.ts).
  notApplicable: boolean;
  // The person's fiche is out, not back yet.
  ficheWaiting: boolean;
}): ValueStatus {
  if (input.notApplicable) return "not_applicable";
  if (input.value === null)
    return input.ficheWaiting && homeOf(input.id) === "fiche"
      ? "waiting"
      : "missing";
  if (!isValidValue(input.id, input.value)) return "invalid";
  // A person's detail read in the Réseau, the fiche said nothing of it.
  if (input.source === "network" && input.id.startsWith("personne."))
    return "unconfirmed";
  return "filled";
}

const homeOf = (id: string): FieldSource =>
  isContractField(id) ? FIELD_HOME[id] : "fiche";

/** Who must act for a value kept at this home. */
export function providerOf(home: FieldSource): ValueProvider {
  switch (home) {
    case "fiche":
      return "person";
    case "organization":
      return "direction";
    default:
      return "owner";
  }
}
