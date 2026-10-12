"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { routes } from "@/lib/auth/redirects";
import { formatBriefDate } from "@/lib/framing/assess";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { applyExecutionPlan } from "@/lib/strategy/actions/documents";
import type { ExecutionPlan } from "@/lib/strategy/execution-plan";
import type { ExecutionRecord } from "@/lib/strategy/execution-queries";

/**
 * « Plan d'exécution » of the validated Brief (MKT-S1-16): what the code
 * proposes to create, each line kept or not, created only once the owner
 * confirms; what is already made from it, with its Brief version and a link.
 */
export function ExecutionPlanCard({
  projectId,
  documentId,
  version,
  plan,
  records,
  members,
  canApply,
}: {
  projectId: string;
  documentId: string;
  version: number;
  plan: ExecutionPlan;
  records: ExecutionRecord[];
  members: Member[];
  canApply: boolean;
}) {
  const t = fr.strategyDocuments.execution;
  const [kept, setKept] = useState<Set<string>>(
    () => new Set(plan.items.map((i) => i.key)),
  );
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nameOf = (id: string) =>
    members.find((m) => m.personId === id)?.name ?? "—";
  const count = plan.items.filter((i) => kept.has(i.key)).length;

  function apply() {
    startTransition(async () => {
      const result = await applyExecutionPlan(projectId, documentId, [...kept]);
      if (result.ok) {
        setConfirming(false);
        setError(null);
        toast.success(t.created(result.created ?? 0));
      } else setError(fr.framing.errors[result.error]);
    });
  }

  return (
    <section aria-labelledby="execution-title" className="flex flex-col gap-3">
      <h3 id="execution-title" className="text-body-md font-semibold">
        {t.title}
      </h3>
      <p className="text-caption text-muted-foreground">{t.body}</p>
      <p className="text-caption text-muted-foreground">
        {t.conception(plan.inConception)}
      </p>

      {plan.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {plan.items.map((item) => {
            const label =
              item.kind === "activation"
                ? t.activation(item.title)
                : t.task(
                    item.title,
                    nameOf(item.assigneeId),
                    formatBriefDate(item.dueDate),
                  );
            return canApply ? (
              <CheckboxField
                key={item.key}
                label={label}
                checked={kept.has(item.key)}
                onChange={(on) =>
                  setKept((set) => {
                    const next = new Set(set);
                    if (on) next.add(item.key);
                    else next.delete(item.key);
                    return next;
                  })
                }
              />
            ) : (
              <p key={item.key} className="text-body-md">
                {label}
              </p>
            );
          })}
        </div>
      ) : (
        <p className="text-body-md text-muted-foreground">{t.nothing}</p>
      )}

      {plan.unplanned.length > 0 && (
        <p className="text-caption text-muted-foreground">
          {t.unplanned(plan.unplanned.map((d) => d.title).join(", "))}
        </p>
      )}
      {plan.existing > 0 && (
        <p className="text-caption text-muted-foreground">
          {t.existing(plan.existing)}
        </p>
      )}

      {canApply && plan.items.length > 0 && (
        <Button
          className="self-start"
          disabled={count === 0}
          onClick={() => setConfirming(true)}
        >
          {t.create(count)}
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          if (!open) setError(null);
        }}
        title={t.confirmTitle}
        description={t.confirmBody(count, version)}
        cancelLabel={fr.framing.actions.cancel}
        closeLabel={fr.strategyDocuments.close}
        confirmLabel={t.create(count)}
        pendingLabel={t.creating}
        pending={pending}
        error={error}
        onConfirm={apply}
      />

      {records.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-body-md font-semibold">{t.madeTitle}</h4>
          <ul className="flex flex-col gap-1">
            {records.map((r) => {
              const href =
                r.kind === "activation" && r.activationId
                  ? routes.projectActivation(projectId, r.activationId)
                  : r.kind === "task" && r.taskId
                    ? routes.projectWork(projectId)
                    : null;
              return (
                <li
                  key={r.id}
                  className="flex items-baseline justify-between gap-3 text-body-md"
                >
                  <span className="break-words">
                    {r.kind === "activation"
                      ? t.activation(t.made(r.label, r.documentVersion))
                      : t.made(r.label, r.documentVersion)}
                  </span>
                  {href && (
                    <Link
                      href={href}
                      className="shrink-0 text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      {t.open}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
