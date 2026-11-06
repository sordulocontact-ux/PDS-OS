import { ContactLinkCard } from "@/components/portal/contact-link-card";
import { emailEnabled } from "@/lib/email/send";
import { loadContactLinks } from "@/lib/portal/contact-links";

/**
 * The person's page by project, read on the server and shown as THE link
 * card (`ContactLinkCard`): one link per person in a démarche, never the
 * workflow's own beside it (Sacha, 06/11/2026). Nothing without a contact.
 */
export async function PersonLink({
  projectId,
  projectTitle,
  contactId,
}: {
  projectId: string;
  projectTitle: string;
  contactId: string | null;
}) {
  if (!contactId) return null;
  const { canEdit, rows } = await loadContactLinks(projectId);
  const row = rows.find((r) => r.contactId === contactId);
  if (!row) return null;
  return (
    <ContactLinkCard
      projectId={projectId}
      projectTitle={projectTitle}
      row={row}
      canEdit={canEdit}
      canEmail={emailEnabled() && Boolean(row.email)}
    />
  );
}
