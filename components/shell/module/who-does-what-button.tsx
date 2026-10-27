"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { roles } from "@/lib/i18n/fr/roles";

import { RolesPanel, type RolesPanelProps } from "./roles-panel";

const fr = { dialogs, roles };

const t = fr.roles;

/** « Qui fait quoi » in the large modal (proto rolesModal). */
export function RolesDialog({
  open,
  onOpenChange,
  ...panel
}: RolesPanelProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      description={t.description}
      closeLabel={fr.dialogs.close}
      size="wide"
    >
      <RolesPanel {...panel} />
    </FormDialog>
  );
}

/**
 * The « Qui fait quoi » button of a module's header (ghost, small), which
 * opens `RolesDialog`. Stand-alone: `ModuleHeader` lays it in its actions;
 * the module builds the roles, links and history (models:
 * `ProductionRoles`, `DesignRoles`).
 */
export function WhoDoesWhatButton(props: RolesPanelProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {t.button}
      </Button>
      <RolesDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}
