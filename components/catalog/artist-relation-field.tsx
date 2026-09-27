import { FieldError } from "@/components/auth/form-message";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { ARTIST_RELATIONS, type ArtistRelation } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// "Relation avec PDS" of an artist form: Signé or Collaboration, each with
// what it means. No default on creation: someone always decides.
export function ArtistRelationField({
  defaultValue,
  hint,
  error,
}: {
  defaultValue?: ArtistRelation | null;
  hint?: string;
  error?: string;
}) {
  const t = fr.catalog.relation;
  return (
    <div className="grid gap-1.5">
      <ChoiceCards
        name="relation"
        legend={t.legend}
        hint={hint}
        defaultValue={defaultValue ?? undefined}
        choices={ARTIST_RELATIONS.map((relation) => ({
          value: relation,
          label: t.labels[relation],
          hint: t.hints[relation],
        }))}
      />
      <FieldError id="relation-error">{error}</FieldError>
    </div>
  );
}
