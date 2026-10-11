// A closed-choice answer (Stratégie, Conception): the keys checked, and the
// « Autre » text when given. Client-safe.
export type ChoiceValue = { choices: string[]; other: string | null };
