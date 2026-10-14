"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { versionName } from "@/lib/production/post/labels";
import type {
  PostPeople,
  PostScope,
  PostVersion,
  VersionDefaults,
} from "@/lib/production/post/types";

import { VersionForm } from "./version-form";

const t = fr.productionPost;

/** The dialog of a version: deposited, or a draft modified. */
export function VersionDialog({
  scope,
  people,
  open,
  version,
  defaults,
  onClose,
}: {
  scope: PostScope;
  people: PostPeople;
  open: boolean;
  version: PostVersion | null;
  defaults: VersionDefaults;
  onClose: () => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={
        version
          ? t.versions.editTitle(versionName(version))
          : t.versions.addTitle
      }
      description={t.versions.formDescription}
      closeLabel={t.close}
      size="wide"
    >
      <VersionForm
        scope={scope}
        version={version}
        defaults={defaults}
        members={people.members}
        contacts={people.contacts}
        onDone={onClose}
      />
    </FormDialog>
  );
}

/** « Déposer une version »: V1, V2, V3… never limited. */
export function VersionAddButton({
  scope,
  people,
  defaults,
}: {
  scope: PostScope;
  people: PostPeople;
  defaults: VersionDefaults;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.versions.add}
      </Button>
      <VersionDialog
        scope={scope}
        people={people}
        open={open}
        version={null}
        defaults={defaults}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
