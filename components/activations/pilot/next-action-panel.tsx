"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ViewLink } from "@/components/ui/view-link";
import { saveNextAction } from "@/lib/activations/pilot-actions";
import type { NextAction } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";

import { NextActionForm } from "./next-action-form";

const t = fr.activations.next;

/**
 * The next action, its reason, who it is expected from and by when (ticket :
 * « PO affiche une prochaine action lisible… L'utilisateur peut la modifier,
 * la marquer sans objet ou choisir explicitement de créer une tâche »).
 */
export function NextActionPanel({
  projectId,
  activationId,
  next,
  members,
  canWrite,
}: {
  projectId: string;
  activationId: string;
  next: NextAction | null;
  members: Member[];
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? null;
  const close = (status: "done" | "not_applicable", message: string) =>
    next &&
    startTransition(async () => {
      const result = await saveNextAction({
        projectId,
        activationId,
        rowId: next.rowId,
        origin: next.origin,
        label: next.label,
        expectedPersonId: next.expectedPersonId ?? "",
        dueOn: next.dueOn ?? "",
        status,
      });
      if (result.ok) toast.success(message);
      else toast.error(result.error);
    });
  const formProps = { projectId, activationId, next, members };

  return (
    <PageSection id="next" title={t.title} card>
      {next ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold break-words">{next.label}</p>
            <p className="text-sm text-muted-foreground">
              {next.origin === "manual" ? t.manual : t.fromRule}
              {next.reason && ` · ${t.reason} : ${next.reason}`}
            </p>
            <p className="text-sm">
              {t.expected} :{" "}
              {nameOf(next.expectedPersonId) ?? fr.activations.noOwner}
              {next.dueOn && ` · ${t.due} : ${formatDate(next.dueOn)}`}
            </p>
            {next.taskId && (
              <ViewLink
                href={routes.projectWork(projectId)}
                className="w-fit text-sm underline underline-offset-4"
              >
                {t.taskLinked}
              </ViewLink>
            )}
          </div>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              {!next.taskId && (
                <DialogButton
                  label={t.createTask}
                  variant="default"
                  title={t.createTaskTitle}
                  description={t.createTaskDescription}
                >
                  {(close) => (
                    <NextActionForm mode="task" {...formProps} onDone={close} />
                  )}
                </DialogButton>
              )}
              <DialogButton
                label={t.edit}
                title={t.editTitle}
                description={t.editDescription}
              >
                {(close) => (
                  <NextActionForm mode="edit" {...formProps} onDone={close} />
                )}
              </DialogButton>
              {next.origin === "manual" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => close("done", t.doneDone)}
                >
                  {t.done}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => close("not_applicable", t.setAsideDone)}
                >
                  {t.setAside}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t.none}</p>
          {canWrite && (
            <DialogButton
              label={t.edit}
              title={t.editTitle}
              description={t.editDescription}
            >
              {(close) => (
                <NextActionForm mode="edit" {...formProps} onDone={close} />
              )}
            </DialogButton>
          )}
        </div>
      )}
    </PageSection>
  );
}
