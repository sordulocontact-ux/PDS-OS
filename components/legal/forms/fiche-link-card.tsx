"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { fr } from "@/lib/i18n/fr";
import { revokeLegalForm } from "@/lib/legal/forms/actions";
import type { FormRow } from "@/lib/legal/forms/queries";
import { formatDay, formatShortInstant } from "@/lib/utils/day";
import { mailtoHref } from "@/lib/utils/mailto";

const t = fr.legalForms.page;

/**
 * A fiche's private link, kept visible in its démarche (proto « Projet
 * complet », rule 19): the link when the server can give it again, « Copier
 * le lien », « Relancer » (a ready e-mail), « Nouveau lien », « Révoquer
 * l'accès » with why, and when it was created, sent (by whom) and opened.
 * Opened is not done.
 */
export function FicheLinkCard({
  projectId,
  projectTitle,
  row,
  pending,
  onRenew,
}: {
  projectId: string;
  projectTitle: string;
  row: FormRow;
  pending: boolean;
  onRenew: () => void;
}) {
  const router = useRouter();
  const link = row.link;
  if (!link || !row.formId) return null;
  const formId = row.formId;
  const meta = [
    t.validUntil(formatDay(link.expiresAt)),
    t.createdOn(formatShortInstant(link.createdAt)),
    link.sentAt ? t.sentBy(link.sentBy, formatShortInstant(link.sentAt)) : null,
    row.openedAt ? t.openedOn(formatShortInstant(row.openedAt)) : null,
  ].filter((part): part is string => Boolean(part));
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[color:var(--border-hairline)] p-3.5">
      {link.url ? (
        <code className="min-w-0 truncate rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-[length:var(--type-body-sm)]">
          {link.url}
        </code>
      ) : (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.noLink}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {link.url && (
          <CopyButton
            value={link.url}
            label={t.copy}
            copiedLabel={t.copied}
            size="sm"
          />
        )}
        {link.url && row.state === "sent" && (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <a
                href={mailtoHref(
                  "",
                  t.emailSubject(projectTitle),
                  t.emailBody(row.name, projectTitle, link.url),
                )}
              />
            }
          >
            {t.remind}
          </Button>
        )}
        <Button variant="ghost" size="sm" disabled={pending} onClick={onRenew}>
          {t.newLink}
        </Button>
        <DialogButton
          label={t.revokeAccess}
          variant="ghost"
          title={t.revokeAccess}
          description={t.revokeBody}
        >
          {(close) => (
            <ReasonForm
              label={t.revokeWhy}
              submitLabel={t.revokeAccess}
              doneMessage={t.revoked}
              run={(reason) => revokeLegalForm(projectId, formId, reason)}
              onDone={() => {
                close();
                router.refresh();
              }}
            />
          )}
        </DialogButton>
      </div>
      <p className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
        {t.linkMeta(meta)}
      </p>
    </div>
  );
}
