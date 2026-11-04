"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FactRowFrame } from "@/components/ui/fact-row-frame";
import { masterRound } from "@/lib/i18n/fr/master-round";

const fr = { masterRound };

const t = fr.masterRound.before;

// The modal is loaded on the first click only.
const StemsDialog = dynamic(() =>
  import("./stems-dialog").then((m) => m.StemsDialog),
);

/**
 * « Pistes séparées · Manquant » for one title, before the mix is sent:
 * the whole row opens « Ajouter les pistes séparées » (StemsDialog), no
 * button beside it. Without manage_catalog (`organizationId` null), the row
 * only says what is missing.
 */
export function MissingStemsRow({
  organizationId,
  masterId,
  title,
}: {
  organizationId: string | null;
  masterId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Mounted from the first click on, so that it can close with its exit.
  const [loaded, setLoaded] = useState(false);
  const row = (
    <FactRowFrame
      label={t.stems}
      value={t.stemsNone(title)}
      state={{ tone: "warning", label: t.missing }}
      onClick={
        organizationId
          ? () => {
              setLoaded(true);
              setOpen(true);
            }
          : undefined
      }
      hrefLabel={organizationId ? t.stemsAdd(title) : undefined}
    />
  );
  if (!organizationId) return row;
  return (
    <>
      {row}
      {loaded && (
        <StemsDialog
          open={open}
          onOpenChange={setOpen}
          organizationId={organizationId}
          masterId={masterId}
          title={title}
          onAdded={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
