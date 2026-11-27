import { emailEnabled } from "@/lib/email/send";
import { contactLinks } from "@/lib/i18n/fr/contact-links";
import { roles } from "@/lib/i18n/fr/roles";
import { loadContactLinks } from "@/lib/portal/contact-links";

import { ContactLinkCard } from "./contact-link-card";

const fr = { roles, contactLinks };

const t = fr.contactLinks;
const l = fr.roles.links;

/**
 * « Liens privés » of « Qui fait quoi » (lot 11): each person outside the
 * team who has something in this project, and their one link to all of
 * it, each as THE link card (`ContactLinkCard` on `PersonLinkCard`, Sacha
 * 27/11/2026: never rows of their own). Server component: a module passes
 * it to `RolesPanel` as `personLinks`; `sub` when the module lists its own
 * links above (« Une page par personne » under them).
 */
export async function ContactLinksSection({
  projectId,
  sub = false,
}: {
  projectId: string;
  sub?: boolean;
}) {
  const { canEdit, rows, projectTitle } = await loadContactLinks(projectId);
  if (rows.length === 0) return null;
  const Title = sub ? "h4" : "h3";
  const canEmail = emailEnabled();
  return (
    <section className="flex flex-col gap-2">
      <Title className={sub ? "font-semibold" : "text-body-md font-semibold"}>
        {sub ? t.title : l.title}
      </Title>
      <p className="text-caption text-muted-foreground">{t.hint}</p>
      <ul className="mt-1 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.contactId}>
            <ContactLinkCard
              projectId={projectId}
              projectTitle={projectTitle}
              row={row}
              canEdit={canEdit}
              canEmail={canEmail && Boolean(row.email)}
              lead={t.objects(row.items, row.todo)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Next to a workflow's own link (an influencer's agreement): the same
 * person's page by project, as the same link card.
 */
export async function ContactLinkOffer({
  projectId,
  contactId,
}: {
  projectId: string;
  contactId: string | null;
}) {
  if (!contactId) return null;
  const { canEdit, rows, projectTitle } = await loadContactLinks(projectId);
  const row = rows.find((r) => r.contactId === contactId);
  if (!row) return null;
  return (
    <ContactLinkCard
      projectId={projectId}
      projectTitle={projectTitle}
      row={row}
      canEdit={canEdit}
      canEmail={emailEnabled() && Boolean(row.email)}
      lead={t.objects(row.items, row.todo)}
    />
  );
}
