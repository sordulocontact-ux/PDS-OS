import { fr } from "@/lib/i18n/fr";
import { bodySegments } from "@/lib/legal/contracts/template-text";

/** A field of a template shown as what it is (« Nom civil »), never as
 * {{personne.nom_civil}}. Shared by the editor, which builds its chips in
 * the DOM, and the read-only text. */
export const fieldChipClass =
  "mx-px rounded-md bg-[var(--surface-pressed)] px-1.5 py-px font-medium whitespace-nowrap text-foreground box-decoration-clone";

export const fieldLabel = (id: string) => fr.legalContracts.fields[id] ?? id;

/** A template's text, read only, its fields as chips. */
export function TemplateBody({ body }: { body: string }) {
  return (
    <div className="max-h-96 overflow-y-auto overscroll-contain rounded-xl border bg-background p-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
      {bodySegments(body).map((segment, index) =>
        segment.kind === "text" ? (
          segment.text
        ) : (
          <span key={index} className={fieldChipClass}>
            {fieldLabel(segment.id)}
          </span>
        ),
      )}
    </div>
  );
}
