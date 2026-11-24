// The side sheet of a record (docs/STYLE-FINANCE-PARTOUT.md § 6.7 bis, the
// Réseau's model, Sacha 24/11/2026): what its blocks are given. Client-safe.

/** A record linked to the one open, as a pill to its page. */
export type SheetLink = { id: string; label: string; href: string };

/** A line of a folded list: a record to its page, a detail at the right
 * (a call and its day, a title and the role in it). */
export type SheetItem = {
  id: string;
  label: string;
  // Its page; none for a plain line (a call's agenda item).
  href?: string;
  detail?: string | null;
};

/** A person of the record (a team member, a party), its line in a block. */
export type SheetPerson = {
  id: string;
  name: string;
  pictureUrl?: string | null;
  // Their page, when they have one (a Réseau contact).
  href?: string;
  // At the right, 13 px secondary (« 3 calls ensemble », a role).
  detail?: string | null;
  // A neutral badge after it (« Le plus proche », « Signe »).
  badge?: string | null;
};
