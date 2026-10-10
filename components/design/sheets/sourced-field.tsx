import { ProvenanceTag } from "@/components/design/sheets/provenance-tag";
import { Label } from "@/components/ui/label";
import type { ProvenanceSource } from "@/lib/design/sheet-fields";

/**
 * One field of the Fiche Livrable form: its label, where its value comes
 * from (once it has one), the control and an optional hint.
 */
export function SourcedField({
  id,
  label,
  source,
  hint,
  children,
}: {
  id: string;
  label: string;
  source?: ProvenanceSource;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {source && <ProvenanceTag source={source} />}
      </div>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
