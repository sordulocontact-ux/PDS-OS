import { z } from "zod";

/**
 * A wording proposed by PO for one text field of a Fiche Livrable (concept
 * or intention), written only from the data given. A suggestion: the person
 * accepts, edits or ignores it.
 */
// Same lesson as the other schemas: a leading free-text field (`request`)
// and a flat shape, or ministral-14b answers the schema itself.
export const sheetWordingSchema = z.object({
  request: z
    .string()
    .describe("En une phrase : ce que la fiche doit dire de ce livrable."),
  text: z
    .string()
    .describe(
      "La formulation proposée, en français, quelques phrases au plus, fidèle aux données. Vide si les données ne suffisent pas.",
    ),
});

export type SheetWordingOutput = z.infer<typeof sheetWordingSchema>;
