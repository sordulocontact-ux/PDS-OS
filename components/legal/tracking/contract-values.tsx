import { ContractValueList } from "@/components/legal/contracts/contract-value-list";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import { isBlocking } from "@/lib/legal/contracts/completeness";
import type {
  AgreementField,
  AgreementRow,
} from "@/lib/legal/contracts/mapping";
import { withReturn } from "@/lib/ui/return-to";

const fr = { legal };

/** Where a blocking value of a contract is fixed: at its source (JUR-10),
 * back to the person's démarche once done. Client-safe. */
export function contractFixHref(row: AgreementRow, projectId: string) {
  const back = `${routes.projectLegalStep(projectId, "tracking")}?ligne=person:${row.key}`;
  return (field: AgreementField): string | null => {
    const home = field.home;
    return home === "network" && row.contactId
      ? withReturn(routes.networkContact(row.contactId), back)
      : home === "mapping"
        ? routes.projectLegalStep(projectId, "contracts")
        : home === "credits"
          ? routes.projectLegalStep(projectId, "inventory")
          : home === "fiche"
            ? routes.projectLegalStep(projectId, "forms")
            : null;
  };
}

/** The values of a contract not generated yet, each with its source
 * (« Rempli automatiquement » / « Manquant », ticket Juridique 03). */
export function ContractValues({
  row,
  open,
  projectId,
}: {
  row: AgreementRow;
  open: boolean;
  projectId: string;
}) {
  const p = fr.legal.panels.contract;
  const blocking = row.fields.filter((f) => isBlocking(f.status));
  // Not asked yet: the fiche is to prepare or send (a sent one is waiting).
  const fromFiche = blocking.filter(
    (f) => f.status === "missing" && f.home === "fiche",
  );
  return (
    <details open={open} className="group rounded-xl border p-4">
      <summary className="cursor-pointer list-none text-sm text-muted-foreground marker:hidden">
        {p.values(row.fields.length, blocking.length)}
      </summary>
      {fromFiche.length > 0 && (
        <ToneCallout tone="warning" className="mt-3">
          {p.missingFromFiche(
            row.name,
            fromFiche.map((f) => f.label).join(", "),
          )}
        </ToneCallout>
      )}
      <div className="mt-3">
        <ContractValueList
          fields={row.fields}
          personName={row.name}
          fixHref={contractFixHref(row, projectId)}
        />
      </div>
    </details>
  );
}
