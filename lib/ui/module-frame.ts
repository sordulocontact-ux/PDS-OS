// Shapes of the common module frame (components/shell/module), client-safe,
// so a server loader can build them without importing a component.

/** One segment of a trail; without `href` it is plain text. */
export type ModuleCrumb = { label: string; href?: string };

/**
 * One fact of a module's header: « Budget **25 000 € HT** ». Without a label,
 * the value reads as plain text (« Néons · Mona Lys · Single »). Dates are
 * said in full by the caller (`formatDay`).
 */
export type ModuleFact = { key: string; label?: string; value: string };
