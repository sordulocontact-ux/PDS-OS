"use client";

import { IconRoadmap } from "nucleo-sharp-essential";
import { useState } from "react";

import { DealStageForm } from "@/components/deals/deal-stage-form";
import { IconBan } from "@/components/icons";
import { FormDialog } from "@/components/ui/form-dialog";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions } from "@/components/ui/row-actions";
import { abandonDeal } from "@/lib/deals/actions";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { deals, dialogs };

/**
 * « ⋯ » beside a deal's title, for whoever writes it: « Changer d'étape »
 * (back to a stage, or one skipped) and « Abandonner » with a reason (Sacha
 * 22/11/2026: in « Maintenant » they were no gesture of the moment, « ça sert
 * à rien »). The deal's own gesture stays in « Maintenant ».
 */
export function DealStageMenu({ deal, name }: { deal: Deal; name: string }) {
  const t = fr.deals.page;
  const [open, setOpen] = useState<"stage" | "abandon" | null>(null);
  const close = () => setOpen(null);
  return (
    <>
      <RowActions
        size="icon-lg"
        label={t.menu(name)}
        actions={[
          {
            key: "stage",
            label: t.otherStage,
            icon: IconRoadmap,
            onSelect: () => setOpen("stage"),
          },
          {
            key: "abandon",
            label: t.abandon,
            icon: IconBan,
            onSelect: () => setOpen("abandon"),
          },
        ]}
      />
      <FormDialog
        open={open === "stage"}
        onOpenChange={(o) => !o && close()}
        title={t.otherStageTitle}
        description={t.otherStageDescription}
        closeLabel={fr.dialogs.close}
      >
        {open === "stage" && <DealStageForm deal={deal} onDone={close} />}
      </FormDialog>
      <FormDialog
        open={open === "abandon"}
        onOpenChange={(o) => !o && close()}
        title={t.abandonTitle}
        description={t.abandonDescription}
        closeLabel={fr.dialogs.close}
      >
        <ReasonForm
          label={t.abandonReason}
          submitLabel={t.abandonSubmit}
          doneMessage={fr.deals.done.abandoned}
          run={(reason) => abandonDeal(deal.id, reason)}
          onDone={close}
        />
      </FormDialog>
    </>
  );
}
