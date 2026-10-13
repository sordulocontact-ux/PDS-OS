import { fr } from "@/lib/i18n/fr";

export type Sections = typeof fr.conceptionDirection.brief.sections;

/** One titled part of the Brief; an empty part says so rather than vanish. */
export function Part({
  name,
  children,
  empty,
}: {
  name: keyof Sections;
  children?: React.ReactNode;
  empty: boolean;
}) {
  const t = fr.conceptionDirection.brief;
  return (
    <section aria-labelledby={`brief-${name}`} className="flex flex-col gap-2">
      <h3 id={`brief-${name}`} className="text-body-lg font-semibold">
        {t.sections[name]}
      </h3>
      {empty ? (
        <p className="text-body-md text-muted-foreground">{t.none}</p>
      ) : (
        <div className="flex flex-col gap-2 text-body-md">{children}</div>
      )}
    </section>
  );
}

export function Lines({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="break-words">
          {item}
        </li>
      ))}
    </ul>
  );
}
