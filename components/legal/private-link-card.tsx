"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { fr } from "@/lib/i18n/fr";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.legalForms.page;

/**
 * A private link kept visible in its démarche (proto « Projet complet »,
 * rule 19) — a fiche's, a split confirmation's: the link when the server
 * can give it again, « Copier le lien », « Marquer comme envoyé » while it
 * is not (PDS OS does not send the e-mail), « Relancer » (a ready e-mail),
 * « Nouveau lien », « Révoquer l'accès » with why, and its line (valid
 * until, created, sent by whom, opened). Opened is not done.
 */
export function PrivateLinkCard({
  url,
  meta,
  remindHref,
  pending,
  onRenew,
  onMarkSent,
  markSentLabel,
  revoke,
}: {
  url: string | null;
  meta: string[];
  // A ready e-mail once the link was sent; null hides « Relancer ».
  remindHref: string | null;
  pending: boolean;
  onRenew: () => void;
  // Set while the link is not marked sent.
  onMarkSent?: () => void;
  markSentLabel?: string;
  revoke: (reason: string) => Promise<WriteResult>;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[color:var(--border-hairline)] p-3.5">
      {url ? (
        <code className="min-w-0 truncate rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-[length:var(--type-body-sm)]">
          {url}
        </code>
      ) : (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.noLink}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {url && (
          <CopyButton
            value={url}
            label={t.copy}
            copiedLabel={t.copied}
            size="sm"
          />
        )}
        {onMarkSent && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={onMarkSent}
          >
            {markSentLabel ?? t.markSent}
          </Button>
        )}
        {url && remindHref && (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<a href={remindHref} />}
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
              run={revoke}
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
