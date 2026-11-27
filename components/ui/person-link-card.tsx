"use client";

import { IconLink } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { Button, buttonVariants, ButtonRoll } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DocumentCard } from "@/components/ui/document-card";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { personLink } from "@/lib/i18n/fr/person-link";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { personLink };

const t = fr.personLink;

export type PersonLinkState = "none" | "notSent" | "sent" | "opened";

const TONE = {
  none: "neutral",
  notSent: "warning",
  sent: "info",
  opened: "success",
} as const;

/** « pds-os.app/c/k7h2m9… »: the copy button gives it whole. */
const shortOf = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname.slice(0, 9)}…`;
  } catch {
    return url;
  }
};

/**
 * THE card of a person's private link (Figma 378-6581, the Master's « Lien
 * de Karim Haddou », Sacha 06/11/2026: one pattern in the whole app): a
 * document headed by the link's name, its dates under it and where it
 * stands (pill); the address shortened with its copy button, « Relancer »
 * (an e-mail PDS OS sends, or a ready one), « Nouveau lien », and the rest
 * in « ⋯ » (« Marquer comme envoyé », « Révoquer »…). No server action
 * here: each module gives its gestures (Master: `LinkPanel`; Juridique:
 * `ContactLinkCard`). `empty` while there is no link; `children` under it
 * (a reason to give, an error, what the link carries); `badge` in place of
 * the link's state when the card says something else first (a signer of the
 * SACEM bulletin: « En attente », « Signé »).
 */
export function PersonLinkCard({
  name,
  line,
  state,
  url,
  pending = false,
  onRemind,
  remindHref,
  onRenew,
  actions = [],
  tools,
  empty,
  badge,
  children,
}: {
  name: string;
  // Under the name: until when the link (and what it opens) is valid.
  line?: string | null;
  state: PersonLinkState;
  // The address, for the owner and the direction only.
  url: string | null;
  pending?: boolean;
  // PDS OS e-mails the reminder; else `remindHref`, a ready e-mail.
  onRemind?: () => void;
  remindHref?: string | null;
  onRenew?: () => void;
  // In « ⋯ ».
  actions?: RowAction[];
  // A module's own gestures on its link, rendered by it (Production's
  // « Nouveau lien » and « Révoquer »), before « ⋯ ».
  tools?: ReactNode;
  // No link yet: what to say and the button that creates it.
  empty?: ReactNode;
  badge?: { tone: Tone; label: string };
  children?: ReactNode;
}) {
  const hasLink = state !== "none";
  return (
    <DocumentCard
      name={t.title(name)}
      line={line ?? undefined}
      icon={IconLink}
      // Folded from the chevron after its pill, and folded on arrival
      // (Sacha, 10/11/2026): its pill says where it stands. Open while there
      // is no link yet, « Créer le lien » being the gesture to make.
      collapsible
      defaultOpen={!hasLink}
      action={
        <StatusBadge tone={badge?.tone ?? TONE[state]}>
          {badge?.label ?? t.states[state]}
        </StatusBadge>
      }
    >
      <div className="flex flex-col gap-3 p-3.5">
        {hasLink ? (
          <div className="flex flex-wrap items-center gap-2">
            {url && (
              <span className="flex min-w-0 items-center gap-2 rounded-full bg-[var(--surface-soft)] py-1 pr-1 pl-4">
                <code
                  className="min-w-0 truncate font-mono text-[length:var(--type-body-sm)]"
                  title={url}
                >
                  {shortOf(url)}
                </code>
                <CopyButton
                  value={url}
                  label=""
                  ariaLabel={t.copy}
                  copiedLabel={t.copied}
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full"
                />
              </span>
            )}
            <span className="ml-auto flex flex-wrap items-center gap-1">
              {onRemind ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={onRemind}
                >
                  {t.remind}
                </Button>
              ) : (
                remindHref && (
                  <a
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                    href={remindHref}
                  >
                    <ButtonRoll>{t.remind}</ButtonRoll>
                  </a>
                )
              )}
              {onRenew && (
                <Button
                  variant="ghost"
                  size="sm"
                  title={t.renewHint}
                  disabled={pending}
                  onClick={onRenew}
                >
                  {t.renew}
                </Button>
              )}
              {tools}
              <RowActions label={t.more(name)} actions={actions} />
            </span>
          </div>
        ) : (
          empty
        )}
        {children}
      </div>
    </DocumentCard>
  );
}
