/** A form opened in place in a step (« Signaler un blocage », « Noter une
 * information »): a card on the soft background, its title above. */
export function ToolCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-soft)] p-4">
      <h3 className="text-body-md font-semibold">{title}</h3>
      {children}
    </section>
  );
}
