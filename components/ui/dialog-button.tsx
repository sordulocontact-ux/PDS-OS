"use client";

import { useState, type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";

/**
 * A button that opens a form in the modal (« Ajouter un article »,
 * « Modifier le lieu »…). The form is mounted per opening and receives the
 * close callback, called on success or « Annuler ».
 */
export function DialogButton({
  label,
  icon: Icon,
  variant = "outline",
  size = "sm",
  title,
  description,
  wide = false,
  children,
}: {
  label: string;
  icon?: ComponentType<{ "aria-hidden"?: boolean; "data-icon"?: string }>;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "lg" | "xs";
  title: string;
  description: string;
  wide?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="relative z-10"
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
        closeLabel={fr.dialogs.close}
        size={wide ? "wide" : "default"}
      >
        {children(close)}
      </FormDialog>
    </>
  );
}
