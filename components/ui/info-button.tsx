"use client";

import { IconCircleInfo } from "nucleo-sharp-essential";

import { DialogButton } from "@/components/ui/dialog-button";

/**
 * « Informations » beside a page's title, a quiet secondary action: what
 * the page is about, read in the side panel, rendered by the page (a
 * project's overview, retour d'Akili du 05/11/2026; a deal, Sacha
 * 23/11/2026). Client, for its icon.
 */
export function InfoButton({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <DialogButton
      label={label}
      icon={IconCircleInfo}
      title={title}
      description={description}
    >
      {children}
    </DialogButton>
  );
}
