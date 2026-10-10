"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { SubmissionDialog } from "@/components/legal/forms/submission-dialog";
import { Button } from "@/components/ui/button";
import { useShowLinks } from "@/components/ui/one-time-links";
import { routes } from "@/lib/auth/redirects";
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
  const showLinks = useShowLinks();
  const [pending, startTransition] = useTransition();

  const prepare = () =>
    startTransition(async () => {
      const result = await prepareLegalForm(projectId, row.key);
      if (result.ok)
        showLinks({
          title: t.linkTitle(row.name),
          description: t.linkBody,
          links: [
            { key: row.key, label: t.linkTitle(row.name), url: result.url },
          ],
          copyLabel: t.copy,
          copiedLabel: t.copied,
          closeLabel: fr.masterPage.form.close,
          onClose: () => router.refresh(),
        });
      else toast.error(result.error);
    });
  const setState = (state: "sent" | "revoked") =>
    startTransition(async () => {
      if (!row.formId) return;
      const result = await setLegalFormState(projectId, row.formId, state);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  const open = row.state === "link_generated" || row.state === "sent";

  // A namesake in the Réseau: the credit is linked first (État des lieux),
  // otherwise the fiche would create a duplicate contact.
  if (row.namesakeId)
    return (
      <div className="flex flex-col gap-1 sm:items-end">
        <p className="text-caption text-muted-foreground">{t.namesake}</p>
        <Link
          href={routes.projectLegal(projectId)}
          className="text-sm underline underline-offset-4"
        >
          {t.linkFirst}
        </Link>
      </div>
    );

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
    </div>
  );
}
