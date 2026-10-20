// The delivery's recipients (proto recipientsPick): the ones PDS OS knows
// need the file, pre-checked — who runs the Distribution, who holds the
// Activations, the external validation —, then the project's other members.
// Client-safe.

export type RecipientPurpose = "distribution" | "activations" | "validation";

export type RecipientOption = {
  key: string;
  personId: string | null;
  contactId: string | null;
  name: string;
  // Under the name: the role, or why it is there.
  detail: string | null;
  purpose: RecipientPurpose | null;
  checked: boolean;
};

type Person = { id: string; name: string };

/** The options in the proto's order, each person once. */
export function recipientOptions(input: {
  distribution: Person | null;
  activations: Person | null;
  validation: Person | null;
  members: Person[];
  labels: Record<RecipientPurpose, string>;
}): RecipientOption[] {
  const out: RecipientOption[] = [];
  const add = (
    p: Person | null,
    kind: "person" | "contact",
    purpose: RecipientPurpose | null,
    checked: boolean,
  ) => {
    if (!p) return;
    const key = `${kind}:${p.id}`;
    const same = out.find((o) => o.key === key);
    if (same) return;
    out.push({
      key,
      personId: kind === "person" ? p.id : null,
      contactId: kind === "contact" ? p.id : null,
      name: p.name,
      detail: purpose ? input.labels[purpose] : null,
      purpose,
      checked,
    });
  };
  add(input.distribution, "person", "distribution", true);
  add(input.activations, "person", "activations", true);
  add(input.validation, "contact", "validation", true);
  for (const m of input.members) add(m, "person", null, false);
  return out;
}
