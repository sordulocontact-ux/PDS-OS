import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicForm } from "@/components/legal/forms/public-form";
import {
  DataUseNote,
  RequesterNote,
} from "@/components/legal/forms/requester-note";
import { fr } from "@/lib/i18n/fr";
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

  return (
    <main className="flex flex-1 justify-center bg-muted/40 px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {t.title}
          </h1>
          {form.state === "open" && (
            <p className="text-muted-foreground">
              {t.intro(form.person, form.project, form.requester.organization)}
            </p>
          )}
        </header>
        {form.state === "open" ? (
          <PublicForm
            token={token}
            prefillRoles={form.prefill.roles}
            // Their own earlier answers win over what the project knows.
            known={{ ...form.prefill.answers, ...form.known }}
            requester={form.requester}
          />
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border bg-background p-6">
            <p className="font-medium">{t.states[form.state]}</p>
            <RequesterNote requester={form.requester} />
          </div>
        )}
        {form.state === "open" && (
          <aside className="flex flex-col gap-5 rounded-2xl border bg-background p-6">
            <RequesterNote requester={form.requester} />
            <DataUseNote requester={form.requester} />
          </aside>
        )}
      </div>
    </main>
  );
}
