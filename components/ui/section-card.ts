// A titled block on its own white card, with a hairline (docs/DESIGN.md
// § 4, « Cartes de section »): the blocks of a title page (PageSection
// `card`) and of a long form (FormSection). No frame inside a card: shared
// pieces drop theirs there with the `in-[.section-card]:` variant
// (FactList, EmptyNote).
export const sectionCardClass =
  "section-card rounded-xl border border-[color:var(--border-hairline)] bg-card p-4 md:p-6";
