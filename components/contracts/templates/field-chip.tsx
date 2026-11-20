import { legalContracts } from "@/lib/i18n/fr/legal-contracts";

const fr = { legalContracts };

/** A field of a template shown as what it is (« Nom civil »), never as
 * {{personne.nom_civil}}. Used by the editor, which builds its chips in the
 * DOM, and the value finder; read only, a template is a document
 * (templateHtml). */
export const fieldChipClass =
  "mx-px rounded-md bg-[var(--surface-pressed)] px-1.5 py-px font-medium whitespace-nowrap text-foreground box-decoration-clone";

export const fieldLabel = (id: string) => fr.legalContracts.fields[id] ?? id;
