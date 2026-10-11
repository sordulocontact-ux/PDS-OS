import { IconChevronLeft } from "nucleo-sharp-essential";

import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import type { TargetRecord } from "@/lib/activations/targets";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";
import type { Tone } from "@/lib/ui/state-tones";

import { OutcomeButton } from "./outcome-form";

const t = fr.activationWork.targets;

/** A collaboration's or a press target's header : back to the list, the
 * Réseau profile (its fiche, its accounts), the step, the outcome. */
export function TargetHeader({
  projectId,
  activationId,
  target: x,
  stage,
  press,
  canWrite,
}: {
  projectId: string;
  activationId: string;
  target: TargetRecord;
  stage: { label: string; tone: Tone } | null;
  press: boolean;
  canWrite: boolean;
}) {
  const accounts = [
    x.tiktok && {
      label: `TikTok @${x.tiktok}`,
      href: `https://www.tiktok.com/@${x.tiktok}`,
    },
    x.instagram && {
      label: `Instagram @${x.instagram}`,
      href: `https://www.instagram.com/${x.instagram}/`,
    },
  ].filter((a): a is { label: string; href: string } => Boolean(a));
  return (
    <header className="flex flex-col gap-2">
      <ViewLink
        href={routes.projectActivationTab(projectId, activationId, "targets")}
        className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconChevronLeft aria-hidden className="size-4" />
        {press ? t.back : t.backCollaborations}
      </ViewLink>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold break-words">
            <ViewLink
              href={routes.networkContact(x.contactId)}
              className="underline-offset-4 hover:underline"
            >
              {x.contactName}
            </ViewLink>
          </h3>
          {stage && <StatusBadge tone={stage.tone}>{stage.label}</StatusBadge>}
          {x.outcome && (
            <StatusBadge tone="neutral">{t.outcomes[x.outcome]}</StatusBadge>
          )}
        </div>
        {canWrite && (
          <OutcomeButton
            projectId={projectId}
            targetId={x.id}
            outcome={x.outcome}
            press={press}
          />
        )}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {x.journalistName && x.journalistId && (
          <ViewLink
            href={routes.networkContact(x.journalistId)}
            className="underline-offset-4 hover:underline"
          >
            {t.journalist} : {x.journalistName}
          </ViewLink>
        )}
        {accounts.map((a) => (
          <a
            key={a.href}
            href={a.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            {a.label}
          </a>
        ))}
        {x.angle && (
          <span>
            {t.angle} : {x.angle}
          </span>
        )}
        {x.outcomeReason && x.outcomeAt && (
          <span>
            {t.outcomeReason} : {x.outcomeReason} ({formatDate(x.outcomeAt)})
          </span>
        )}
      </p>
    </header>
  );
}
