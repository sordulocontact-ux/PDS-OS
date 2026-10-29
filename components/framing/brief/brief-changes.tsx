/** « Changé depuis la version 1 : Enveloppe, 25 000 € → 28 000 € » (rule 18). */
export function BriefChanges({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-body-sm">
      {children}
    </p>
  );
}
