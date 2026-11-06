"use client";

import { useState, type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { records } from "@/lib/i18n/fr/records";

const fr = { records };

/**
 * A button opening a form in the modal, whose data (the record, its
 * choices) is read by a server action when it opens: "Nouveau contact",
 * "Nouveau contrat", "Modifier". `children` gets the data and a close.
 */
export function LoadedFormButton<T>({
  label,
  icon: Icon,
  variant = "default",
  size = "lg",
  className,
  dialogSize = "default",
  title,
  description,
  closeLabel,
  load,
  children,
}: {
  label: string;
  icon?: ComponentType<{ "aria-hidden"?: boolean; "data-icon"?: string }>;
  variant?: "default" | "outline";
  // "xs" inside a table row (with `className="relative z-10"` above the
  // row's stretched link).
  size?: "lg" | "sm" | "xs";
  className?: string;
  // `wide`: a long form laid out in two columns (the contact form).
  dialogSize?: "default" | "medium" | "wide";
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
        size={size}
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        {Icon && <Icon aria-hidden data-icon="inline-start" />}
        {label}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        size={dialogSize}
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
