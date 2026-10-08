import { fr } from "@/lib/i18n/fr";

/**
 * The « * » after the label of a required field (docs/DESIGN.md § 4,
 * « Champs obligatoires »): optional fields carry no mention. Hidden from
 * screen readers, which hear the control's own `required`; `announce` says
 * it in words where the control cannot (a group of chips, a picker).
 */
export function RequiredMark({ announce = false }: { announce?: boolean }) {
  return (
    <>
      <span aria-hidden className="ml-0.5 text-muted-foreground">
        *
      </span>
      {announce && <span className="sr-only"> ({fr.forms.required})</span>}
    </>
  );
}
