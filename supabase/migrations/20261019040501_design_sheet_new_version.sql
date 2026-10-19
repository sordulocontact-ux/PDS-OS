-- « Modifier (nouvelle version) » of a validated Fiche Livrable (proto
-- « Projet complet », fnewv; ticket § 12: « Une modification importante
-- crée une nouvelle version et peut exiger une nouvelle validation »): when
-- the responsible opened the next version. From then on the sheet is a
-- Brouillon again (lib/design/sheet-phase.ts), to submit and validate
-- anew; the version already transferred stays the Production's until the
-- next transfer. Written by the responsible through design_sheet_can_edit.

alter table public.design_sheets add column new_version_at timestamptz;
