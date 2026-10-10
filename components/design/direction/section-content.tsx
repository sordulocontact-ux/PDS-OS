import type { DesignTopic } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";

/**
 * What one section of the artistic direction carries: its retained
 * intentions, by topic, and its references. Shared by the synthesis before
 * sending and by a submitted version (its snapshot).
 */
export function SectionContent({
  intentions,
  references,
  note,
}: {
  intentions: Array<{ topic: DesignTopic; value: string }>;
  references: Array<{ id: string; label: string; note: string | null }>;
  note?: string | null;
}) {
  const t = fr.conceptionDirection.summary;
  return (
    <div className="grid gap-4 text-body-md sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h4 className="text-caption text-muted-foreground">{t.intentions}</h4>
        {intentions.length ? (
          <dl className="flex flex-col gap-1.5">
            {intentions.map((i) => (
              <div key={`${i.topic}-${i.value}`} className="flex flex-col">
                <dt className="text-caption text-muted-foreground">
                  {fr.conceptionDirection.topics[i.topic]}
                </dt>
                <dd className="font-medium break-words">{i.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted-foreground">{t.noIntention}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h4 className="text-caption text-muted-foreground">{t.references}</h4>
        {references.length ? (
          <ul className="flex flex-col gap-1.5">
            {references.map((r) => (
              <li key={r.id} className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{r.label}</span>
                {r.note && (
                  <span className="text-caption text-muted-foreground">
                    {r.note}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t.noReference}</p>
        )}
        {note && (
          <p className="text-caption text-muted-foreground">
            {t.note} : {note}
          </p>
        )}
      </div>
    </div>
  );
}
