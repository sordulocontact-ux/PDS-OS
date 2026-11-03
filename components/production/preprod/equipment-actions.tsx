"use client";

import { IconCheck, IconPlus } from "nucleo-sharp-essential";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import type { Member } from "@/lib/framing/related";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import {
  deleteEquipment,
  mergeEquipment,
  verifyEquipment,
} from "@/lib/production/preprod/actions-equipment";
import type { Equipment } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { EquipmentForm } from "./equipment-form";
import { RecordMenu } from "@/components/ui/record-menu";

const fr = { productionPreprod };

const t = fr.productionPreprod.equipment;

type Common = {
  projectId: string;
  sheetId: string;
  members: Member[];
  contacts: NetworkOption[];
};

/** « Ajouter un article », or « Saisir depuis ce devis » with `quote`. */
export function AddEquipmentButton({
  quote,
  ...common
}: Common & { quote?: { id: string; fileName: string } }) {
  return (
    <DialogButton
      label={quote ? t.fromQuote : t.add}
      icon={quote ? undefined : IconPlus}
      variant={quote ? "ghost" : "outline"}
      size={quote ? "xs" : "sm"}
      title={quote ? t.fromQuoteTitle(quote.fileName) : t.addTitle}
      description={t.formDescription}
      wide
    >
      {(close) => (
        <EquipmentForm
          {...common}
          item={null}
          quoteFileId={quote?.id ?? null}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

/** A line's « ⋯ »: « Marquer vérifiée » for a line read from a quote,
 * « Modifier », « Supprimer ». */
export function EquipmentRowMenu({
  item,
  ...common
}: Common & { item: Equipment }) {
  const [, startTransition] = useTransition();
  const verify = () =>
    startTransition(async () => {
      const result = await verifyEquipment({
        projectId: common.projectId,
        equipmentId: item.id,
      });
      if (result.ok) toast.success(t.verified);
      else toast.error(result.error);
    });
  return (
    <RecordMenu
      label={item.label}
      extra={
        item.status === "to_verify"
          ? [
              {
                key: "verify",
                label: t.verify,
                icon: IconCheck,
                onSelect: verify,
              },
            ]
          : []
      }
      edit={{
        title: t.editTitle(item.label),
        description: t.formDescription,
        wide: true,
        form: (close) => (
          <EquipmentForm
            {...common}
            item={item}
            quoteFileId={null}
            onDone={close}
          />
        ),
      }}
      remove={{
        title: t.deleteTitle,
        body: t.deleteBody(item.label),
        done: t.deleted,
        run: () =>
          deleteEquipment({
            projectId: common.projectId,
            equipmentId: item.id,
          }),
      }}
    />
  );
}

/** « Rapprocher » two lines that look alike, after the person confirms. */
export function MergeButton({
  projectId,
  keep,
  other,
}: {
  projectId: string;
  keep: { id: string; label: string };
  other: { id: string; label: string };
}) {
  return (
    <ConfirmButton
      label={t.merge}
      variant="ghost"
      size="xs"
      title={t.mergeTitle}
      body={t.mergeBody(keep.label, other.label)}
      confirmLabel={t.merge}
      pendingLabel={fr.productionPreprod.saving}
      done={t.merged}
      run={() =>
        mergeEquipment({ projectId, keepId: keep.id, otherId: other.id })
      }
    />
  );
}
