import { legalForms } from "@/lib/i18n/fr/legal-forms";
import type { FormRequester } from "@/lib/legal/forms/public";
import { formatInstant } from "@/lib/utils/instant";

import { RequesterNote } from "./requester-note";

const fr = { legalForms };

/**
 * The end of the fiche, once sent (retour d'Akili, 02/11/2026: « revoir l'UI
 * de fin, beaucoup de bruit visuel »): one line that says it is done, the
 * dated receipt (JUR-14), what happens next, whom to write to — once, on the
 * card itself, not a card within the card, and without the greeting nor the
 * data notice of the form.
 */
export function FormDone({
  status,
  sentAt,
  requester,
}: {
  status: "complete" | "action_required";
  sentAt: string | null;
  requester: FormRequester;
}) {
  const t = fr.legalForms.public;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p role="status" className="font-semibold">
          {t.done.title}
        </p>
        {status === "action_required" && (
          <p className="text-sm text-muted-foreground">{t.done.differs}</p>
        )}
        {sentAt && (
          <p className="text-sm text-muted-foreground">
            {t.review.receipt(formatInstant(sentAt))}
          </p>
        )}
      </div>
      <section className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">{t.afterSubmit.title}</h2>
        <p className="text-sm text-muted-foreground">
          {t.afterSubmit.review} {t.afterSubmit.follow}
        </p>
      </section>
      <RequesterNote requester={requester} />
    </div>
  );
}
