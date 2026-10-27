"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import type { Member } from "@/lib/framing/related";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import type { NetworkOption } from "@/lib/production/sheet";

import { IncidentForm } from "./incident-form";

const fr = { productionShoot };

const t = fr.productionShoot.incidents;

/** « Signaler un incident », in the section's header. */
export function IncidentAddButton({
  projectId,
  sheetId,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.add}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.addTitle}
        description={t.addDescription}
        closeLabel={fr.productionShoot.close}
      >
        <IncidentForm
          projectId={projectId}
          sheetId={sheetId}
          draft={{ incident: null, title: "", impact: "" }}
          members={members}
          contacts={contacts}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}
