import { FactList } from "@/components/ui/fact-list";
import {
  IDENTITY_REF_KINDS,
  IDENTITY_TEXTS,
  type IdentityFields,
  type IdentityRef,
} from "@/lib/catalog/identity-fields";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";

const fr = { artistIdentity };

/**
 * One version of the artist's identity, read-only (MKT-C2-04): its texts,
 * then its links by kind. `refAction` adds a control to each link (from a
 * release: « Ajouter aux références de la sortie »).
 */
export function IdentityView({
  fields,
  refAction,
}: {
  fields: IdentityFields;
  refAction?: (ref: IdentityRef) => React.ReactNode;
}) {
  const t = fr.artistIdentity;
  const facts = IDENTITY_TEXTS.flatMap((k) =>
    fields[k] ? [{ label: t.fields[k], value: fields[k] }] : [],
  );
  return (
    <div className="flex flex-col gap-5">
      {facts.length > 0 && <FactList facts={facts} />}
      {IDENTITY_REF_KINDS.map((kind) => {
        const refs = fields.refs.filter((r) => r.kind === kind);
        if (refs.length === 0) return null;
        return (
          <div key={kind} className="flex flex-col gap-2">
            <h4 className="text-body-md font-medium">{t.refKinds[kind]}</h4>
            <ul className="flex flex-col gap-2">
              {refs.map((ref) => (
                <li
                  key={`${ref.kind}-${ref.url}`}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate text-body-md font-medium underline-offset-2 hover:underline"
                    >
                      {ref.title ?? ref.url}
                    </a>
                    {ref.note && (
                      <span className="text-caption text-muted-foreground">
                        {ref.note}
                      </span>
                    )}
                  </div>
                  {refAction?.(ref)}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
