"use client";

import { IconLink } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { legalForms };

const t = fr.legalForms.page;

export type PrivateLinkState = "opened" | "sent" | "unsent";

const STATE_TONE = {
  opened: "success",
  sent: "success",
  unsent: "warning",
} as const;

/**
 * A private link kept visible in its démarche (Figma PDS OS, node 229:2257;
 * docs/DESIGN.md § 1 « Lien privé ») — a fiche's, a split confirmation's:
 * its header (« Lien privé de X » and where it stands: opened, sent, not
 * sent yet), then the URL in a chip with its copy button, and the gestures
 * in text: « Marquer comme envoyé » while it is not (PDS OS does not send
 * the e-mail), « Relancer » (a ready e-mail), « Nouveau lien », « Révoquer
 * l'accès » with why, in a dialog. No line of dates: those are in « Déjà
 * fait ». Opened is not done.
 */
export function PrivateLinkCard({
  name,
  state,
  url,
  remindHref,
  pending,
  onRenew,
  onMarkSent,
  markSentLabel,
  revoke,
}: {
  // Whose link it is (« Lien privé de Sami Kader »).
  name: string;
  state: PrivateLinkState;
  url: string | null;
  // A ready e-mail once the link was sent; null hides « Relancer ».
  remindHref: string | null;
  pending: boolean;
  onRenew: () => void;
  // Set while the link is not marked sent.
  onMarkSent?: () => void;
  markSentLabel?: string;
  revoke: (reason: string) => Promise<WriteResult>;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-[color:var(--border-hairline)] bg-card">
      <div className="flex items-center gap-3 rounded-t-xl border-b border-[color:var(--border-hairline)] bg-[var(--surface-soft)] px-3.5 py-3">
        <IconLink aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 font-semibold break-words">
          {t.linkOf(name)}
        </span>
        <StatusBadge tone={STATE_TONE[state]} size="sm">
          {t.linkState[state]}
        </StatusBadge>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3.5">
        {url ? (
          <span className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full bg-[var(--surface-soft)] py-1 pr-1 pl-4">
            <code className="min-w-0 truncate text-[length:var(--type-caption)]">
              {url}
            </code>
            <CopyButton
              value={url}
              label=""
              copiedLabel={t.copied}
              variant="ghost"
              size="icon-sm"
              ariaLabel={t.copy}
            />
          </span>
        ) : (
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.noLink}
          </p>
        )}
        <div className="flex flex-wrap items-center">
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
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onRenew}
          >
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
                }}
              />
            )}
          </DialogButton>
        </div>
      </div>
    </div>
  );
}
