// A card's title and the sentence under it, read as one block: 10 px between
// them (6 px until Sacha, 07/11/2026: « le gap entre le titre et la
// description est trop petit … sur toutes les pages »), the card's own gap
// only around the pair (Sacha, 04/11/2026: « on dirait qu'ils ne sont pas
// ensemble »).
export function TitleBlock({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2.5">{children}</div>;
}
