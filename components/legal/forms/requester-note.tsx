import { legalForms } from "@/lib/i18n/fr/legal-forms";
import type { FormRequester } from "@/lib/legal/forms/public";

const fr = { legalForms };

// « Une question ? »: whom an outside person writes to about their fiche,
// the project's owner (UX test of 09/10/2026: the page named no one).
export function RequesterNote({ requester }: { requester: FormRequester }) {
  const t = fr.legalForms.public.requester;
  const { contact, email } = requester;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-sm font-medium">{t.title}</h2>
      <p className="text-sm text-muted-foreground">
        {contact && email ? (
          <>
            {t.body(contact)}{" "}
            <a
              href={`mailto:${email}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {email}
            </a>
          </>
        ) : contact ? (
          t.bodyNoEmail(contact)
        ) : (
          t.team
        )}
      </p>
    </section>
  );
}

// « À quoi servent vos données »: what an outside person is told before
// sending personal data (RGPD, article 13: purposes, who reads them, how
// long, their rights).
export function DataUseNote({
  requester,
  network = false,
}: {
  requester: FormRequester;
  // A Réseau fiche: the texts without a project.
  network?: boolean;
}) {
  const use = fr.legalForms.public.dataUse;
  const t = network ? { ...use, ...use.network } : use;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{t.title}</h2>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
        <li>{t.purposes}</li>
        <li>{t.access(requester.organization)}</li>
        <li>{t.retention}</li>
        <li>{t.rights}</li>
      </ul>
    </section>
  );
}
