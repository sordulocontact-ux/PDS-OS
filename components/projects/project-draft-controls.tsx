"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { DraftStatus } from "@/components/projects/use-project-draft";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";
import { deleteProjectDraft } from "@/lib/projects/draft-actions";
import { cn } from "@/lib/utils";

const fr = { shell };

// Under the new project form: where its draft stands, and, once there is
// one, the way to throw it away (confirmed: what was typed is lost).
export function ProjectDraftControls({
  draftId,
  status,
  pause,
}: {
  draftId: string | null;
  status: DraftStatus;
  pause: (paused: boolean) => void;
}) {
  const t = fr.shell.newProject.draft;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!draftId) return;
    setError(null);
    pause(true);
    startTransition(async () => {
      const result = await deleteProjectDraft(draftId);
      if (!result.ok) {
        pause(false);
        setError(t.deleteFailed);
        return;
      }
      setConfirming(false);
      router.replace(routes.projectsNew);
    });
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p
        role="status"
        className={cn(
          "text-sm",
          status === "error" ? "text-error" : "text-muted-foreground",
        )}
      >
        {t[status]}
      </p>
      {draftId && (
        <>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="w-fit px-0"
            onClick={() => setConfirming(true)}
          >
            {t.delete}
          </Button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={(open) => {
              setConfirming(open);
              if (!open) setError(null);
            }}
            title={t.confirmTitle}
            description={t.confirmDescription}
            cancelLabel={t.cancel}
            closeLabel={t.close}
            confirmLabel={t.confirm}
            pendingLabel={t.deleting}
            pending={pending}
            destructive
            error={error}
            onConfirm={remove}
          />
        </>
      )}
    </div>
  );
}
