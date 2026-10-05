"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { SubmissionDialog } from "@/components/legal/forms/submission-dialog";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { fr } from "@/lib/i18n/fr";
import { prepareLegalForm, setLegalFormState } from "@/lib/legal/forms/actions";
import type { FormRow } from "@/lib/legal/forms/queries";

/**
 * What can be done for one person's fiche: prepare its link (shown once, to
 * copy and send by any channel, « notamment pour un envoi WhatsApp dans le
 * MVP »), mark it sent, revoke it, read the answers.
 */
export function FormRowActions({
  projectId,
  row,
}: {
  projectId: string;
  row: FormRow;
}) {
  const router = useRouter();
  const t = fr.legalForms.page;
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const prepare = () =>
    startTransition(async () => {
      const result = await prepareLegalForm(projectId, row.key);
      if (result.ok) setUrl(result.url);
      else toast.error(result.error);
    });
  const setState = (state: "sent" | "revoked") =>
    startTransition(async () => {
      if (!row.formId) return;
      const result = await setLegalFormState(projectId, row.formId, state);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.copied);
    } catch {
      // The field stays selectable: the link can be copied by hand.
    }
  };
  const open = row.state === "link_generated" || row.state === "sent";

  return (
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      {row.state === "link_generated" && (
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={pending}
          onClick={() => setState("sent")}
        >
          {t.markSent}
        </Button>
      )}
      {row.submission && <SubmissionDialog projectId={projectId} row={row} />}
      <Button
        type="button"
        variant={row.state === "none" ? "default" : "outline"}
        size="xs"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={prepare}
      >
        {pending ? t.preparing : row.state === "none" ? t.prepare : t.newLink}
      </Button>
      {(open || row.state === "action_required") && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={pending}
          onClick={() => setState("revoked")}
        >
          {t.revoke}
        </Button>
      )}
      <FormDialog
        open={url !== null}
        onOpenChange={(next) => {
          if (!next) {
            setUrl(null);
            router.refresh();
          }
        }}
        title={t.linkTitle(row.name)}
        description={t.linkBody}
        closeLabel={fr.masterPage.form.close}
      >
        <div className="flex flex-col gap-4">
          <Input
            readOnly
            value={url ?? ""}
            aria-label={t.linkTitle(row.name)}
            className="font-mono text-sm"
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" size="lg" onClick={copy}>
              {t.copy}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
