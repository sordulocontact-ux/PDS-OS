import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
} from "@/components/portal/portal-sections";
import { PublicForm } from "@/components/legal/forms/public-form";
import {
  DataUseNote,
  RequesterNote,
} from "@/components/legal/forms/requester-note";
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
  const open = form.state === "open";
  const cards = [
    {
      id: "ps-form",
      title: fr.portal.form.title,
      state: open ? ("todo" as const) : ("done" as const),
      action: { label: fr.portal.form.action },
      order: 1,
      body: open ? (
        <>
          <p className="text-muted-foreground">
            {t.intro(form.person, form.project, form.requester.organization)}
          </p>
          <PublicForm
            token={token}
            prefillRoles={form.prefill.roles}
            // Their own earlier answers win over what the project knows.
            known={{ ...form.prefill.answers, ...form.known }}
            requester={form.requester}
          />
          <RequesterNote requester={form.requester} />
          <DataUseNote requester={form.requester} />
        </>
      ) : (
        <>
          <p className="font-medium">{t.states[form.state]}</p>
          <RequesterNote requester={form.requester} />
        </>
      ),
    },
  ];
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
