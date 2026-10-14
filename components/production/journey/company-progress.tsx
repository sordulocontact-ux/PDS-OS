import { ProviderLinkButton } from "@/components/production/post/provider-link-button";
import { PageSection } from "@/components/shell/page-section";
import { ProgressBar } from "@/components/ui/progress-bar";
import { fr } from "@/lib/i18n/fr";
import {
  PROGRESS_KEYS,
  type SheetOrganization,
} from "@/lib/production/organization";
import type { ProviderLinkState } from "@/lib/production/post/types";
import { formatDateTime } from "@/lib/release/format";

const t = fr.productionOrganization.progress;

/** External production: where the company says its preproduction stands —
 * calls, gear, crew, schedule —, read here, never retyped (Ibé, 14/10). */
export function CompanyProgress({
  projectId,
  sheetId,
  organization,
  link,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  organization: SheetOrganization;
  link: ProviderLinkState | null;
  canOrganize: boolean;
}) {
  const done = PROGRESS_KEYS.filter((k) => organization.progress[k]).length;
  const company = organization.company;
  return (
    <PageSection
      id="company-progress"
      title={t.title}
      description={t.description}
      card
      action={
        canOrganize && company ? (
          <ProviderLinkButton
            projectId={projectId}
            sheetId={sheetId}
            holder={company}
            link={link}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <ProgressBar value={done} max={4} label={t.count(done)} />
        <p className="text-sm text-muted-foreground">
          {organization.progressAt
            ? t.updated(formatDateTime(organization.progressAt))
            : t.never}
        </p>
        <ul className="flex flex-col gap-2">
          {PROGRESS_KEYS.map((k) => (
            <li
              key={k}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
            >
              <span
                aria-hidden
                className={
                  organization.progress[k]
                    ? "text-[color:var(--tone-success-fg)]"
                    : "text-muted-foreground"
                }
              >
                {organization.progress[k] ? "✓" : "○"}
              </span>
              <span>{t.items[k]}</span>
            </li>
          ))}
        </ul>
      </div>
    </PageSection>
  );
}
