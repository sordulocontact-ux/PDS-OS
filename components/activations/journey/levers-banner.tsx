import { IconChevronDown } from "nucleo-sharp-essential";

import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import type { LeverBoard } from "@/lib/activations/levers";
import { kindHasMode } from "@/lib/activations/model";
import { routes } from "@/lib/auth/redirects";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";
import { activations } from "@/lib/i18n/fr/activations";

import { LeverRowActions } from "./lever-row-actions";

const fr = { activations, activationJourney };

const t = fr.activationJourney.banner;

/**
 * « Leviers à préparer » above the list (proto leversBanner): open while a
 * lever of the Brief de sortie waits to become an activation, folded when
 * only levers kept for later remain, gone when every lever has its
 * activation. The project's owner creates (mode on the line for Influence
 * and RP) or keeps for later; others see « À préparer ».
 */
export function LeversBanner({
  projectId,
  levers,
  canCreate,
}: {
  projectId: string;
  levers: LeverBoard;
  canCreate: boolean;
}) {
  const todo = levers.items.filter((l) => l.state === "proposed");
  const later = levers.items.filter((l) => l.state === "later");
  if (levers.briefVersion === null || (!todo.length && !later.length))
    return null;
  return (
    <details
      id="levers"
      open={todo.length > 0}
      className="group rounded-2xl border border-[color:var(--border-hairline)] bg-card px-5 py-4 group-open:pb-5"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <b className="block font-semibold">
            {todo.length > 0
              ? t.toTransform(todo.length)
              : t.kept(later.length)}
          </b>
          <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {t.sub}
          </span>
        </span>
        <IconChevronDown
          aria-hidden
          className="size-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform duration-[var(--duration-base)] group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ul className="mt-4 flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)]">
        {levers.items.map((l) => (
          <li
            key={l.leverId}
            className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3"
          >
            <span className="min-w-0 flex-1 basis-56">
              <b className="block font-semibold break-words">{l.label}</b>
              <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                {t.source(
                  fr.activations.kinds[l.kind],
                  l.label,
                  levers.briefVersion ?? 1,
                )}
              </span>
            </span>
            {l.state === "created" && l.activationId ? (
              <span className="flex items-center gap-2">
                <StatusBadge tone="success" size="sm">
                  {t.created}
                </StatusBadge>
                <ViewLink
                  href={routes.projectActivation(projectId, l.activationId)}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  <ButtonRoll>{t.open}</ButtonRoll>
                </ViewLink>
              </span>
            ) : canCreate ? (
              <span className="flex items-center gap-2">
                {l.state === "later" && (
                  <StatusBadge tone="neutral" size="sm">
                    {t.later}
                  </StatusBadge>
                )}
                <LeverRowActions
                  projectId={projectId}
                  leverId={l.leverId}
                  withMode={kindHasMode(l.kind) && l.state !== "later"}
                  later={l.state === "later"}
                />
              </span>
            ) : (
              <StatusBadge tone="warning" size="sm">
                {l.state === "later" ? t.later : t.toPrepare}
              </StatusBadge>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
