"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import {
  issueContactLink,
  markContactLinkSent,
  revokeContactLink,
} from "@/lib/portal/contact-link-actions";
import type { ContactLinkRow } from "@/lib/portal/contact-links";

const t = fr.contactLinks;

const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

/**
 * The gestures on a person's page link, owner only: « Créer le lien », or
 * « Copier le lien », « Marquer comme envoyé » (PDS OS sends no e-mail),
 * « Nouveau lien » (replaces the former) and « Révoquer » with why.
 */
export function ContactLinkActions({
  projectId,
  row,
}: {
  projectId: string;
  row: ContactLinkRow;
}) {
  const origin = useOrigin();
  const issue = useWriteSubmit(() => undefined, t.created);
  const sent = useWriteSubmit(() => undefined, t.marked);
  const l = row.link;
  if (!l)
    return (
      <Button
        type="button"
        size="sm"
        disabled={issue.pending}
        onClick={() =>
          issue.run(() => issueContactLink(projectId, row.contactId))
        }
      >
        {t.create}
      </Button>
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      {l.path && origin && (
        <CopyButton
          value={`${origin}${l.path}`}
          label={t.copy}
          copiedLabel={t.copied}
          size="sm"
        />
      )}
      {!l.sentAt && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={sent.pending}
          onClick={() => sent.run(() => markContactLinkSent(projectId, l.id))}
        >
          {t.markSent}
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title={t.renewHint}
        disabled={issue.pending}
        onClick={() =>
          issue.run(() => issueContactLink(projectId, row.contactId), t.renewed)
        }
      >
        {t.renew}
      </Button>
      <DialogButton
        label={t.revoke}
        variant="ghost"
        title={t.revokeTitle(row.name)}
        description={t.revokeDescription}
      >
        {(close) => (
          <ReasonForm
            label={t.revokeReason}
            submitLabel={t.revoke}
            doneMessage={t.revoked}
            run={(reason) => revokeContactLink(projectId, l.id, reason)}
            onDone={close}
          />
        )}
      </DialogButton>
      {(issue.error ?? sent.error) && (
        <span className="w-full text-[length:var(--type-caption)] text-[color:var(--tone-danger-fg)]">
          {issue.error ?? sent.error}
        </span>
      )}
    </span>
  );
}
