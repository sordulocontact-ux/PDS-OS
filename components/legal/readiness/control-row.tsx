import { WaiverButton } from "@/components/legal/readiness/readiness-gestures";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { ReadinessControl } from "@/lib/legal/readiness/controls";

const t = fr.legalReadiness;

/**
 * One control of « Prêt pour la sortie » (proto « Projet complet »): its
 * domain and weight, what it is, where it stands, who answers for it and
 * what comes next, its source; « Ouvrir » where it is done and, for the
 * direction on an open control, « Accorder une dérogation ».
 */
export function ControlRow({
  projectId,
  control: c,
  canDecide,
}: {
  projectId: string;
  control: ReadinessControl;
  canDecide: boolean;
}) {
  const weight =
    c.status === "ok"
      ? t.badge.ok
      : c.status === "waived"
        ? t.badge.waived
        : c.blocking
          ? t.badge.blocking
          : t.badge.notBlocking;
  const tone =
    c.status === "ok"
      ? "success"
      : c.status === "waived"
        ? "warning"
        : c.blocking
          ? "danger"
          : "neutral";
  return (
    <li className="flex flex-col gap-1.5 px-3.5 py-3">
      <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
        {t.domains[c.domain]} · {weight}
      </span>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="min-w-0 font-semibold break-words">{c.label}</span>
        <StatusBadge tone={tone} size="sm">
          {weight}
        </StatusBadge>
      </div>
      <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {[
          c.reason,
          c.responsible ? t.responsible(c.responsible) : null,
          c.next ? t.next(c.next) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
      <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
        {t.source(c.source, t.noProof)}
      </span>
      {c.waiver && (
        <span className="text-[length:var(--type-body-sm)] text-[color:var(--tone-warning-fg)]">
          {t.waiver.by(c.waiver.by, c.waiver.at, c.waiver.reason)}
        </span>
      )}
      {(c.href || (canDecide && c.status === "open" && !c.final)) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {c.href && (
            <ViewLink
              href={c.href}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t.open}
            </ViewLink>
          )}
          {canDecide && c.status === "open" && !c.final && (
            <WaiverButton
              projectId={projectId}
              controlKey={c.key}
              label={c.label}
            />
          )}
        </div>
      )}
    </li>
  );
}
