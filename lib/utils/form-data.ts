/** A multiple choice submitted as one JSON field (`OptionSelect multiple`,
 * `ChipMultiChoice`): its values, or none when it cannot be read. */
export function jsonListOf(raw: FormDataEntryValue | null): string[] {
  try {
    const value: unknown = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}
