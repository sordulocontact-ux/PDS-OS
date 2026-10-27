import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import type { PressKitState } from "@/lib/activations/press-kit";
import { routes } from "@/lib/auth/redirects";
import { activationWork } from "@/lib/i18n/fr/activation-work";

const fr = { activationWork };

const t = fr.activationWork.pressKit;

/** The Dossier de presse of the Stratégie as RP sees it : validated or not,
 * and joined to how many sent messages — « Dossier validé ≠ Dossier envoyé ». */
export function PressKitPanel({
  projectId,
  kit,
  sentCount,
}: {
  projectId: string;
  kit: PressKitState;
  sentCount: number;
}) {
  return (
    <PageSection
      id="press-kit"
      title={t.title}
      description={t.description}
      action={
        <ViewLink
          href={routes.projectStrategyPressKit(projectId)}
          className="text-sm underline underline-offset-4"
        >
          {t.open}
        </ViewLink>
      }
    >
      <div className="flex flex-col gap-1 text-sm">
        {kit.approved ? (
          <p className="flex flex-wrap items-center gap-2">
            <StatusBadge size="sm" tone="success">
              {t.validated(kit.approved.version)}
            </StatusBadge>
            <span className="text-muted-foreground">
              {sentCount > 0 ? t.sent(sentCount) : t.notSent}
            </span>
          </p>
        ) : kit.latest ? (
          <StatusBadge size="sm" tone="warning">
            {kit.latest.state === "sent"
              ? t.pending(kit.latest.version)
              : t.draft}
          </StatusBadge>
        ) : (
          <p className="text-muted-foreground">{t.missing}</p>
        )}
      </div>
    </PageSection>
  );
}
