"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { reviewLegalForm } from "@/lib/legal/forms/actions";
import type { FormRow } from "@/lib/legal/forms/queries";

const facts = (values: Record<string, string>) =>
  Object.entries(values).map(([id, value]) => ({
    label: fr.legalForms.fields[id] ?? id,
    value: fr.legalForms.options[id]?.[value] ?? value,
  }));

/** The answers of a fiche, the person's apart from this project's, and the
 * corrections to accept or not (« revue avant propagation »). */
export function SubmissionDialog({
  projectId,
  row,
}: {
  projectId: string;
  row: FormRow;
}) {
  const router = useRouter();
  const t = fr.legalForms.page;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const s = row.submission;
  if (!s) return null;
  const corrections = Object.entries(s.corrections);

  const review = (accept: boolean) =>
    startTransition(async () => {
      if (!row.formId) return;
      const result = await reviewLegalForm(projectId, row.formId, accept);
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => setOpen(true)}
      >
        {t.answers}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.answersTitle(row.name)}
        description={t.since(
          new Date(s.submittedAt).toLocaleDateString("fr-FR"),
        )}
        closeLabel={fr.masterPage.form.close}
        size="wide"
      >
        <div className="flex flex-col gap-5">
          <FactList
            facts={[
              {
                label: t.roles,
                value: [
                  ...s.roles.map(
                    (r) =>
                      fr.legalForms.roles[
                        r as keyof typeof fr.legalForms.roles
                      ] ?? r,
                  ),
                  ...(s.otherRole ? [s.otherRole] : []),
                ].join(", "),
              },
            ]}
          />
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t.person}</h3>
            <FactList facts={facts(s.person)} />
          </section>
          {Object.keys(s.contribution).length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{t.contribution}</h3>
              <FactList facts={facts(s.contribution)} />
            </section>
          )}
          {row.state === "action_required" && corrections.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">{t.corrections}</h3>
              <FactList
                facts={corrections.map(([id, c]) => ({
                  label: fr.legalForms.fields[id] ?? id,
                  value: t.correction(c.before, c.after),
                }))}
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  disabled={pending}
                  onClick={() => review(false)}
                >
                  {t.refuse}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={pending}
                  aria-busy={pending || undefined}
                  onClick={() => review(true)}
                >
                  {t.accept}
                </Button>
              </div>
            </section>
          )}
        </div>
      </FormDialog>
    </>
  );
}
