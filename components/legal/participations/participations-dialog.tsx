"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { legalParticipations } from "@/lib/i18n/fr/legal-participations";
import { PARTICIPATIONS_PARAM } from "@/lib/ui/legal-steps";

const fr = { dialogs, legalParticipations };

/**
 * « Participations et contrats » as the large side panel of « Titres »,
 * like « Qui fait quoi » (Sacha 27/11/2026). Mounted by the page only while
 * the URL holds `?participations`: closing it takes the parameter off, at
 * once here and then on the server, which stops loading it.
 */
export function ParticipationsDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    const next = new URLSearchParams(params.toString());
    next.delete(PARTICIPATIONS_PARAM);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={fr.legalParticipations.title}
      closeLabel={fr.dialogs.close}
      size="wide"
    >
      {children}
    </FormDialog>
  );
}
