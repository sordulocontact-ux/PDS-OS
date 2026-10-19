import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formPortalCard } from "@/components/legal/forms/public-cards";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
} from "@/components/portal/portal-sections";
import { fr } from "@/lib/i18n/fr";
import { getPortalFrame } from "@/lib/portal/frame";
import { getPublicForm, noteFormOpened } from "@/lib/legal/forms/public";

const t = fr.legalForms.public;

// A fiche de renseignements opened from its link, without an account
// (ticket Juridique 02). Never indexed, no referrer: the token is the key.
export const metadata: Metadata = {
  title: `${t.title} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function LegalFormPage({
  params,
}: PageProps<"/f/[token]">) {
  const { token } = await params;
  const form = await getPublicForm(token);
  if (!form) notFound();
  if (form.state === "open") await noteFormOpened(token);
  const frame = await getPortalFrame("form", token);
  if (form.state === "expired" || form.state === "revoked")
    return (
      <PortalShell frame={frame} title={fr.portal.closed}>
        <p className="text-muted-foreground">{t.states[form.state]}</p>
      </PortalShell>
    );
  const cards = [formPortalCard({ linkKey: token, form })];
  return (
    <PortalShell
      frame={frame}
      role={fr.portal.roles.form}
      title={portalTitle(cards)}
    >
      <PortalSections cards={cards} />
    </PortalShell>
  );
}
