"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { work } from "@/lib/i18n/fr/work";

import { TaskForm } from "./my-task-form";

const fr = { dialogs, work };

/**
 * « Ajouter une tâche », at the head of the Travail (retour du 09/11/2026:
 * PO puts the tasks in, writing one is the second gesture, so a button in
 * place of « Voir le calendrier », its form in a modal). Once added, « Mes
 * tâches » is shown (`onAdded`) and read again.
 */
export function AddTaskButton({
  today,
  onAdded,
}: {
  today: string;
  onAdded: () => void;
}) {
  const t = fr.work.tasks.form;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.open}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.addTitle}
        description={t.addDescription}
        closeLabel={fr.dialogs.close}
      >
        <TaskForm
          today={today}
          onDone={() => setOpen(false)}
          onSaved={() => {
            onAdded();
            router.refresh();
          }}
        />
      </FormDialog>
    </>
  );
}
