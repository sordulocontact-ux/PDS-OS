import Link from "next/link";

import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  DossierField,
  DossierSection,
} from "@/lib/distribution/delivery-file";
import { fr } from "@/lib/i18n/fr";
import { distributionSourceTone } from "@/lib/ui/state-tones";

const t = fr.distribution.dossier;

/**
 * The delivery file in sections close to The Orchard's (ticket § 12), each
 * field with its source. Read-only: a value is corrected in its module.
 */
export function DossierSections({ sections }: { sections: DossierSection[] }) {
  return (
    <div className="grid gap-6">
      {sections.map((section) => (
        <PageSection
          key={section.key}
          id={`dossier-${section.key}`}
          title={section.title}
          description={`The Orchard : ${section.orchard}`}
          card
        >
          <div className="grid gap-6">
            {section.groups.map((group) => (
              <div key={group.key} className="grid gap-3">
                {group.title && <h3 className="font-medium">{group.title}</h3>}
                <dl className="grid gap-3">
                  {group.fields.map((field) => (
                    <FieldRow
                      key={`${field.key}-${field.label}`}
                      field={field}
                    />
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </PageSection>
      ))}
    </div>
  );
}

function FieldRow({ field }: { field: DossierField }) {
  const isParam = field.origin === "distribution";
  const unvalidated = field.state === "unvalidated";
  const restricted = field.state === "restricted";
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-4">
      <dt className="text-sm text-muted-foreground">{field.label}</dt>
      <dd className="grid min-w-0 gap-1">
        {field.value === null ? (
          <span>
            <StatusBadge
              tone={
                isParam ? "warning" : distributionSourceTone("missing", true)
              }
              size="sm"
            >
              {isParam ? t.toFill : t.missing}
            </StatusBadge>
          </span>
        ) : (
          <span
            className={
              restricted
                ? "text-sm break-words text-muted-foreground"
                : "font-medium break-words"
            }
          >
            {field.value}
          </span>
        )}
        {unvalidated && (
          <span>
            <StatusBadge tone="warning" size="sm">
              {fr.distribution.readiness.states.unvalidated}
            </StatusBadge>
          </span>
        )}
      </dd>
      <dd className="flex items-baseline gap-3 text-sm text-muted-foreground">
        <span>{t.origins[field.origin]}</span>
        {field.href && (field.value === null || unvalidated) && (
          <Link
            href={field.href}
            className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline"
          >
            {t.correct}
          </Link>
        )}
      </dd>
    </div>
  );
}
