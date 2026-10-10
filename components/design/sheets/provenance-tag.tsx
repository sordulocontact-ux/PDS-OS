import type { ProvenanceSource } from "@/lib/design/sheet-fields";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * Where a value of a Fiche Livrable comes from, next to its label: the
 * validated Stratégie, confirmed intentions, a call, a person, a file, or a
 * suggestion of PO the person accepted — the latter set apart.
 */
export function ProvenanceTag({ source }: { source: ProvenanceSource }) {
  const label = fr.conceptionSheet.provenance[source];
  return (
    <span
      title={fr.conceptionSheet.provenanceLabel(label)}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium",
        source === "suggestion"
          ? "bg-[var(--tone-info-bg)] text-[color:var(--tone-info-fg)]"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span className="sr-only">{fr.conceptionSheet.provenanceLabel("")}</span>
      {label}
    </span>
  );
}
