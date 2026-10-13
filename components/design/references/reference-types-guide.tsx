import { fr } from "@/lib/i18n/fr";

/**
 * What goes where in the Conception (MKT-C2-09): a reference, a moodboard,
 * a creative proposal, a work version — each with its short definition,
 * folded so it never hides the references themselves.
 */
export function ReferenceTypesGuide() {
  const t = fr.conceptionKinds;
  const rows = [
    { title: t.types.reference, body: t.definitions.reference },
    { title: t.types.moodboard, body: t.definitions.moodboard },
    { title: t.proposalTitle, body: t.definitions.proposal },
    { title: t.workVersionTitle, body: t.definitions.workVersion },
  ];
  return (
    <details className="group rounded-xl border border-border bg-background px-4 py-3">
      <summary className="cursor-pointer text-body-md font-medium">
        {t.guideTitle}
      </summary>
      <dl className="grid gap-3 pt-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.title} className="flex flex-col gap-0.5">
            <dt className="text-body-md font-medium">{row.title}</dt>
            <dd className="text-caption text-muted-foreground">{row.body}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
