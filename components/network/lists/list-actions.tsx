"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconLock,
  IconPenWriting2,
  IconTrash,
  IconUsers2,
} from "nucleo-sharp-essential";
import Link from "next/link";
import { useState } from "react";

import type { PickerOption } from "@/components/catalog/search-picker";
import { AddPeopleButton } from "@/components/network/lists/add-people-button";
import { RenameListForm } from "@/components/network/lists/rename-list-form";
import { Button, buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { networkLists } from "@/lib/i18n/fr/network-lists";
import {
  deleteNetworkList,
  setNetworkListShared,
  setNetworkListValidated,
} from "@/lib/network/lists-actions";
import type { NetworkListState } from "@/lib/network/lists-types";

const fr = { networkLists, dialogs };

/**
 * A list's gestures, in its page's head (Ibé, 18/11/2026). « Valider la
 * liste » for the direction on a shared list waiting for it (then the main
 * gesture); « Créer un projet » (`createProjectHref`: who creates projects,
 * once some people are artists of the Catalogue); « Ajouter des personnes »
 * for who keeps it up (in the empty state instead while it is empty); in
 * « ⋯ »: « Renommer », « Partager avec l'équipe » / « Garder pour moi »,
 * « Supprimer la liste » for its author, « Retirer la validation » for the
 * direction.
 */
export function ListActions({
  list,
  rights,
  people,
  createProjectHref,
}: {
  list: { id: string; name: string; shared: boolean; state: NetworkListState };
  rights: { people: boolean; author: boolean; validate: boolean };
  // The Réseau to add from and who is already in it; null: empty list.
  people: { options: PickerOption[]; inList: string[] } | null;
  createProjectHref: string | null;
}) {
  const t = fr.networkLists;
  const [open, setOpen] = useState<"rename" | "delete" | null>(null);
  const validating = useWriteSubmit(undefined, t.validate.done);
  const toggling = useWriteSubmit(undefined, t.share.onDone);
  // Success redirects to « Mes listes » (deleteNetworkList).
  const deleting = useWriteSubmit(undefined, t.remove.done);
  const canValidate = rights.validate && list.state === "toValidate";

  const menu: RowAction[] = [
    ...(rights.author
      ? [
          {
            key: "rename",
            label: t.rename.action,
            icon: IconPenWriting2,
            onSelect: () => setOpen("rename"),
          },
          {
            key: "share",
            label: list.shared ? t.share.off : t.share.on,
            icon: list.shared ? IconLock : IconUsers2,
            onSelect: () =>
              toggling.run(() =>
                setNetworkListShared({ listId: list.id, shared: !list.shared }),
              ),
          },
        ]
      : []),
    ...(rights.validate && list.state === "validated"
      ? [
          {
            key: "unvalidate",
            label: t.validate.undo,
            icon: IconArrowDottedRotateAnticlockwise,
            onSelect: () =>
              validating.run(() =>
                setNetworkListValidated({ listId: list.id, validated: false }),
              ),
          },
        ]
      : []),
    ...(rights.author
      ? [
          {
            key: "delete",
            label: t.remove.action,
            icon: IconTrash,
            onSelect: () => setOpen("delete"),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canValidate && (
        <Button
          size="lg"
          disabled={validating.pending}
          onClick={() =>
            validating.run(() =>
              setNetworkListValidated({ listId: list.id, validated: true }),
            )
          }
        >
          {t.validate.button}
        </Button>
      )}
      {createProjectHref && (
        <Link
          href={createProjectHref}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <ButtonRoll>{t.createProject}</ButtonRoll>
        </Link>
      )}
      {rights.people && people && (
        <AddPeopleButton
          listId={list.id}
          listName={list.name}
          options={people.options}
          inList={people.inList}
          variant={canValidate ? "outline" : "default"}
        />
      )}
      <RowActions label={t.listMenu} size="icon-lg" actions={menu} />
      <FormDialog
        open={open === "rename"}
        onOpenChange={(next) => setOpen(next ? "rename" : null)}
        title={t.rename.title}
        description={t.rename.description}
        closeLabel={fr.dialogs.close}
      >
        {open === "rename" && (
          <RenameListForm
            listId={list.id}
            name={list.name}
            onDone={() => setOpen(null)}
          />
        )}
      </FormDialog>
      <ConfirmDialog
        open={open === "delete"}
        onOpenChange={(next) => !next && !deleting.pending && setOpen(null)}
        title={t.remove.title(list.name)}
        description={t.remove.body}
        cancelLabel={t.remove.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={t.remove.confirm}
        pendingLabel={t.remove.pending}
        pending={deleting.pending}
        error={deleting.error}
        destructive
        onConfirm={() =>
          deleting.run(() => deleteNetworkList({ listId: list.id }))
        }
      />
    </div>
  );
}
