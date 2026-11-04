// A card's title and the sentence under it, read as one block: 6 px between
// them, the card's own gap only around the pair (Sacha, 04/11/2026: « on
// dirait qu'ils ne sont pas ensemble »).
export function TitleBlock({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1.5">{children}</div>;
}
