"use client";

import { IconLink, IconPaperPlane2 } from "nucleo-sharp-essential";

import { IconLinkSlash } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { LinkPill } from "@/components/ui/link-pill";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
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
 * in text: « Relancer » (a ready e-mail) and « Nouveau lien »; the rest in
 * « ⋯ » (never three text buttons, Sacha 27/11/2026): « Marquer comme
 * envoyé » while it is not (PDS OS does not send the e-mail), « Révoquer
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
  const actions: RowAction[] = [];
  if (onMarkSent) {
    actions.push({
      key: "mark-sent",
      label: markSentLabel ?? t.markSent,
      icon: IconPaperPlane2,
      onSelect: () => {
        if (!pending) onMarkSent();
      },
    });
  }
  actions.push({
    key: "revoke",
    label: t.revokeAccess,
    icon: IconLinkSlash,
    dialog: {
      title: t.revokeAccess,
      description: t.revokeBody,
      body: (close) => (
        <ReasonForm
          label={t.revokeWhy}
          submitLabel={t.revokeAccess}
          doneMessage={t.revoked}
          run={revoke}
          onDone={close}
        />
      ),
    },
  });
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-[color:var(--border-hairline)] bg-card">
      <div className="flex items-center gap-3 rounded-t-xl border-b border-[color:var(--border-hairline)] bg-[var(--surface-soft)] px-3.5 py-3 modern:px-4">
        <IconLink aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 font-semibold break-words">
          {t.linkOf(name)}
        </span>
        <StatusBadge tone={STATE_TONE[state]} size="sm">
          {t.linkState[state]}
        </StatusBadge>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3.5 modern:p-4">
        {url ? (
          <LinkPill url={url} copyLabel={t.copy} copiedLabel={t.copied} />
        ) : (
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.noLink}
          </p>
        )}
        <div className="flex flex-wrap items-center">
          {url && remindHref && (
            <Button
              variant="outline"
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
          <RowActions label={t.moreActions} size="icon-sm" actions={actions} />
        </div>
      </div>
    </div>
  );
}
