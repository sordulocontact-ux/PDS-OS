"use client";

import { useState, type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { IconAction } from "@/components/ui/icon-action";

const fr = { dialogs };

/**
 * A button that opens a form in the modal (« Ajouter un article »,
 * « Modifier le lieu »…). The form is mounted per opening and receives the
 * close callback, called on success or « Annuler ». `children` may also be
 * plain content read in the modal (the overview's « Informations »).
 */
export function DialogButton({
  label,
  icon: Icon,
  variant = "outline",
  size = "sm",
  title,
  description,
  wide = false,
  iconOnly = false,
  iconSize = "icon",
  children,
}: {
  label: string;
  icon?: ComponentType<{ "aria-hidden"?: boolean; "data-icon"?: string }>;
  variant?: "default" | "outline" | "ghost";
  // `default`: the main action of « Maintenant ».
  size?: "sm" | "default" | "lg" | "xs";
  title: string;
  description: string;
  wide?: boolean;
  // Its icon alone, its label in a tooltip shown fast and to screen readers
  // (a list's tools, as the proto, Sacha 15/11/2026). Needs `icon`.
  iconOnly?: boolean;
  // `icon-sm` beside the small buttons of a card's head.
  iconSize?: "icon" | "icon-sm";
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      {iconOnly && Icon ? (
        <IconAction
          label={label}
          icon={Icon}
          variant={variant}
          size={iconSize}
          onClick={() => setOpen(true)}
        />
      ) : (
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
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        closeLabel={fr.dialogs.close}
        size={wide ? "wide" : "default"}
      >
        {typeof children === "function" ? children(close) : children}
      </FormDialog>
    </>
  );
}
