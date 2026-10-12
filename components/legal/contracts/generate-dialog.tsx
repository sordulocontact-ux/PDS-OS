"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ContractValueList } from "@/components/legal/contracts/contract-value-list";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { generateLegalContract } from "@/lib/legal/contracts/actions";
import { isBlocking } from "@/lib/legal/contracts/completeness";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";

/**
 * The values a copy will carry, each with its source, the missing ones with
 * where to fill them in (« L'écran distingue Rempli automatiquement et
 * Manquant avec la source de chaque valeur »), and « Générer le contrat »
 * once nothing is missing.
 */
export function GenerateDialog({
  projectId,
  row,
}: {
  projectId: string;
  row: AgreementRow;
}) {
  const t = fr.legalContracts;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!row.needId || !row.template) return null;
  const missing = row.fields.filter((f) => isBlocking(f.status)).length;
  const ready = row.state === "ready_to_generate";

  const generate = () =>
    startTransition(async () => {
      const result = await generateLegalContract(projectId, row.needId!);
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      if (result.contractId) router.push(routes.contract(result.contractId));
    });

  return (
    <>
      <Button
        type="button"
        variant={ready ? "default" : "outline"}
        size="xs"
        onClick={() => setOpen(true)}
      >
        {ready ? t.agreements.generate : t.agreements.missingCount(missing)}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.agreements.fieldsTitle(row.name)}
        description={t.agreements.fieldsDescription(
          `${row.template.name} · v${row.template.version}`,
        )}
        closeLabel={t.templates.close}
        size="wide"
      >
        <div className="flex flex-col gap-5">
          <ContractValueList
            fields={row.fields}
            personName={row.name}
            fixHref={(field) =>
              field.home === "fiche"
                ? routes.projectLegalStep(projectId, "forms")
                : field.home === "credits"
                  ? routes.projectLegal(projectId)
                  : null
            }
          />
          {ready && (
            <Button
              type="button"
              size="lg"
              className="self-end"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={generate}
            >
              {pending ? t.agreements.generating : t.agreements.generate}
            </Button>
          )}
        </div>
      </FormDialog>
    </>
  );
}
