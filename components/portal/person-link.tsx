import type { ComponentProps, ReactNode } from "react";

import { ContactLinkCard } from "@/components/portal/contact-link-card";
import { emailEnabled } from "@/lib/email/send";
import { loadContactLinks } from "@/lib/portal/contact-links";

/**
 * The person's page by project, read on the server and shown as THE link
 * card (`ContactLinkCard`): one link per person in a démarche, never the
 * workflow's own beside it (Sacha, 06/11/2026). `fallback` without a
 * contact, or for someone the project does not list; `lead`, `badge` and
 * `children` go to the card (a signer of the SACEM bulletin).
 */
export async function PersonLink({
  projectId,
  projectTitle,
  contactId,
  lead,
  badge,
  fallback = null,
  children,
}: {
  projectId: string;
  projectTitle: string;
  contactId: string | null;
  lead?: string;
  badge?: ComponentProps<typeof ContactLinkCard>["badge"];
  fallback?: ReactNode;
  children?: ReactNode;
}) {
  if (!contactId) return fallback;
  const { canEdit, rows } = await loadContactLinks(projectId);
  const row = rows.find((r) => r.contactId === contactId);
  if (!row) return fallback;
  return (
    <ContactLinkCard
      projectId={projectId}
      projectTitle={projectTitle}
      row={row}
      canEdit={canEdit}
      canEmail={emailEnabled() && Boolean(row.email)}
      lead={lead}
      badge={badge}
    >
      {children}
    </ContactLinkCard>
  );
}
