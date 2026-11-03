"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { useShowLinks } from "@/components/ui/one-time-links";
import { productionProvider } from "@/lib/i18n/fr/production-provider";
import { roles } from "@/lib/i18n/fr/roles";
import { createProviderLink } from "@/lib/production/post/provider-link-actions";
import type { ProviderLinkState } from "@/lib/production/post/types";
import type { Holder } from "@/lib/production/sheet";
import { formatDateTime } from "@/lib/release/format";

const fr = { productionProvider, roles };

const t = fr.productionProvider;

/**
 * « Lien du prestataire » for a Réseau contact holding a step or a
 * correction request (PROD-026): the link is shown once to copy; the line
 * says when the current one was made and opened.
 */
export function ProviderLinkButton({
  projectId,
  sheetId,
  holder,
  link,
  renew = false,
}: {
  projectId: string;
  sheetId: string;
  holder: Holder;
  link: ProviderLinkState | null;
  // « Nouveau lien » of « Liens privés » (RolesPanel): the button alone,
  // the panel says when the link was made and opened.
  renew?: boolean;
}) {
  const showLinks = useShowLinks();
  const [pending, setPending] = useState(false);
  if (holder.kind !== "contact") return null;

  async function create() {
    setPending(true);
    const result = await createProviderLink({
      projectId,
      sheetId,
      contactId: holder.id,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    showLinks({
      title: t.linkTitle(holder.name),
      description: t.linkDescription,
      links: [
        {
          key: holder.id,
          label: t.linkLabel(holder.name),
          url: `${window.location.origin}/p/${result.token}`,
        },
      ],
      copyLabel: t.copy,
      copiedLabel: t.copied,
      closeLabel: t.close,
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={create}
      >
        {renew && link ? fr.roles.links.renew : link ? t.linkAgain : t.link}
      </Button>
      {link && !renew && (
        <span className="text-xs text-muted-foreground">
          {t.sentOn(formatDateTime(link.createdAt))}
          {" · "}
          {link.lastOpenedAt
            ? t.openedOn(formatDateTime(link.lastOpenedAt))
            : t.notOpened}
        </span>
      )}
    </div>
  );
}
