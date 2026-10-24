import type { PortalCardItem } from "@/components/portal/portal-sections";
import { ComplementForm } from "@/components/legal/forms/complement-form";
import { PublicForm } from "@/components/legal/forms/public-form";
import {
  DataUseNote,
  RequesterNote,
} from "@/components/legal/forms/requester-note";
import { fr } from "@/lib/i18n/fr";
import type { PublicForm as PublicFormData } from "@/lib/legal/forms/public";

const t = fr.legalForms.public;

/**
 * The fiche de renseignements as a card of a private page (ticket Juridique
 * 02): to fill while open, then « Fait ». On the fiche's own link (/f) and
 * on the person's page (/c): `linkKey` says which.
 */
export function formPortalCard({
  linkKey,
  form,
}: {
  linkKey: string;
  form: Exclude<PublicFormData, { state: "expired" | "revoked" }>;
}): PortalCardItem {
  const open = form.state === "open" || form.state === "complement";
  return {
    id: "ps-form",
    title:
      form.state === "complement" ? t.complement.title : fr.portal.form.title,
    state: open ? "todo" : "done",
    action: { label: fr.portal.form.action },
    order: 1,
    workflow: "legal",
    body:
      form.state === "open" ? (
        <>
          <p className="text-muted-foreground">
            {t.intro(form.person, form.project, form.requester.organization)}
          </p>
          <PublicForm
            token={linkKey}
            prefillRoles={form.prefill.roles}
            // Their own earlier answers win over what the project knows.
            known={{ ...form.prefill.answers, ...form.known }}
            requester={form.requester}
          />
          <RequesterNote requester={form.requester} />
          <DataUseNote requester={form.requester} />
        </>
      ) : form.state === "complement" ? (
        <>
          <p className="text-muted-foreground">
            {t.complement.intro(form.person)}
          </p>
          {form.note && <p className="whitespace-pre-line">{form.note}</p>}
          <ComplementForm linkKey={linkKey} missing={form.missing} />
          <RequesterNote requester={form.requester} />
        </>
      ) : (
        <>
          <p className="font-medium">{t.states[form.state]}</p>
          <RequesterNote requester={form.requester} />
        </>
      ),
  };
}
