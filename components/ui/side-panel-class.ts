// The panel on the right (docs/STYLE-FINANCE-PARTOUT.md § 6.7 and 6.8),
// shared by the side sheet (a row's detail) and the dialog opened on the
// right (a form, a gesture): floating 12 px from the edges, 520 px, a
// hairline and no shadow, sliding in 24 px with a fade; the whole screen on
// phones. Its scrim is the app's dark one. A longer form sets
// `--panel-width` (panelWidth).
export const sidePanelClass =
  "fixed inset-0 z-50 flex flex-col border border-[color:var(--border-default)] bg-[var(--surface-raised)] text-foreground outline-none transition-[translate,opacity] duration-[var(--duration-base)] ease-[var(--ease-out)] data-ending-style:translate-x-6 data-ending-style:opacity-0 data-starting-style:translate-x-6 data-starting-style:opacity-0 motion-reduce:transition-opacity sm:inset-y-3 sm:right-3 sm:left-auto sm:w-[min(var(--panel-width,520px),calc(100%-1.5rem))] sm:rounded-[var(--radius-xl)]";

export const sidePanelScrimClass =
  "fixed inset-0 z-50 bg-[var(--glass-scrim)] transition-opacity duration-[var(--duration-base)] data-ending-style:opacity-0 data-starting-style:opacity-0";

// A wider panel for a longer form (DialogContent `size`), as the centred
// modal's widths.
export const panelWidth = {
  default: undefined,
  medium: "[--panel-width:var(--dialog-width-medium)]",
  wide: "[--panel-width:var(--dialog-width-wide)]",
  // A document read beside its form (« Déposer un contrat existant »).
  document: "[--panel-width:var(--dialog-width-viewer)]",
} as const;
