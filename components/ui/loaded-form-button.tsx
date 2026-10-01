"use client";

import { useState, type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { fr } from "@/lib/i18n/fr";

/**
 * A button opening a form in the modal, whose data (the record, its
 * choices) is read by a server action when it opens: "Nouveau contact",
 * "Nouveau contrat", "Modifier". `children` gets the data and a close.
 */
export function LoadedFormButton<T>({
  label,
  icon: Icon,
  variant = "default",
  title,
  description,
  closeLabel,
  load,
  children,
}: {
  label: string;
  icon?: ComponentType<{ "aria-hidden"?: boolean; "data-icon"?: string }>;
  variant?: "default" | "outline";
  title: string;
  description: string;
  closeLabel: string;
  load: () => Promise<T>;
  children: (data: T, close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button
        type="button"
        size="lg"
        variant={variant}
        onClick={() => setOpen(true)}
      >
        {Icon && <Icon aria-hidden data-icon="inline-start" />}
        {label}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        closeLabel={closeLabel}
      >
        <Loaded
          load={load}
          loadingLabel={fr.records.edit.loading}
          errorLabel={fr.records.edit.loadFailed}
        >
          {(data) => children(data, close)}
        </Loaded>
      </FormDialog>
    </>
  );
}
