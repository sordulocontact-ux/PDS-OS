import { ChoiceCards } from "@/components/ui/choice-cards";
import { fr } from "@/lib/i18n/fr";
import type { Availability } from "@/lib/production/sheet";

const AVAILABILITIES = ["to_confirm", "available", "unavailable"] as const;

/** The availability a person sets for whoever holds a position: never
 * confirmed by PO. */
export function AvailabilityChoices({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: Availability;
}) {
  const t = fr.productionNeeds.availability;
  return (
    <ChoiceCards
      name={name}
      legend={t.legend}
      columns={3}
      defaultValue={defaultValue}
      choices={AVAILABILITIES.map((value) => ({
        value,
        label: t.values[value],
        hint: t.hints[value],
      }))}
    />
  );
}

/** Reads the availability a form sent; anything else stays « à confirmer ». */
export function availabilityOf(value: FormDataEntryValue | null): Availability {
  return value === "available" || value === "unavailable"
    ? value
    : "to_confirm";
}
