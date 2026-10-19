import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadContactCards } from "@/components/portal/contact-cards";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
} from "@/components/portal/portal-sections";
import { fr } from "@/lib/i18n/fr";
import {
  getContactPage,
  noteContactPageOpened,
} from "@/lib/portal/contact-page";
import { contactRoleLine } from "@/lib/portal/contact-roles";

const t = fr.portal;

// One page per person and per project (lot 11, proto portalPage): what
// every workflow asks of them, opened from their link without an account.
// Never indexed, no referrer: the token is the key.
export const metadata: Metadata = {
  title: `${t.page.title} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ContactPage({ params }: PageProps<"/c/[token]">) {
  const { token } = await params;
  const page = await getContactPage(token);
  if (!page) notFound();
  if (page.state !== "open")
    return (
      <PortalShell frame={null} title={t.closed}>
        <p className="text-muted-foreground">{t.page.closed[page.state]}</p>
      </PortalShell>
    );
  await noteContactPageOpened(token);
  const cards = await loadContactCards(token, page);
  const frame = {
    project: page.project,
    artist: page.artist,
    format: page.format,
    person: page.person,
    role: contactRoleLine(page.roles),
    owner: page.owner,
    ownerRole: page.ownerRole,
  };
  return (
    <PortalShell frame={frame} title={portalTitle(cards)}>
      {cards.length > 0 && <PortalSections cards={cards} grouped />}
    </PortalShell>
  );
}
