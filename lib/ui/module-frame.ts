// Shapes of the common module frame (components/shell/module), client-safe,
// so a server loader can build them without importing a component.

/** A page a segment of the trail can switch to (its siblings: the
 * Marketing's sub-modules, the activations, the deliverables). */
export type CrumbOption = {
  key: string;
  label: string;
  href: string;
  // One grey line under the label (« Influence · Interne »).
  detail?: string;
  // The page the viewer is on.
  current?: boolean;
  // Done (a green check, like the Marketing's pills).
  done?: boolean;
  // The viewer's actions there (a blue count, like the pills).
  mine?: number;
};

/** One segment of a trail; without `href` it is plain text. With
 * `options` (two or more), a double chevron after it opens its siblings to
 * switch to (Sacha 10/11/2026, like the project's switcher). */
export type ModuleCrumb = {
  label: string;
  href?: string;
  options?: CrumbOption[];
};

/**
 * One fact of a module's header: « Budget **25 000 € HT** ». Without a label,
 * the value reads as plain text (« Néons · Mona Lys · Single »). Dates are
 * said in full by the caller (`formatDay`).
 */
export type ModuleFact = { key: string; label?: string; value: string };
