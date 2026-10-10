"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ContributorForm } from "@/components/catalog/master-page/contributor-form";
import { SessionForm } from "@/components/catalog/master-page/session-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import type { MasterFactAction } from "@/lib/master-workflow/types";

/**
 * "Ajouter une session" / "Créditer" on a row of the État du master: the
 * title page's own form in the modal (same action, same rules). Saved, the
 * page refreshes and the row reads its new state.
 */
export function TitleFormButton({
  action,
}: {
  action: Extract<
    MasterFactAction,
    { kind: "add_session" | "credit_engineer" }
  >;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const t = fr.masterWorkflow.inventory.actions;
  const page = fr.masterPage;
  const done = () => {
    setOpen(false);
    router.refresh();
  };
  const session = action.kind === "add_session";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        // Above the row's stretched link.
        className="relative z-10"
        onClick={() => setOpen(true)}
      >
        {session ? t.addSession : t.credit}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={session ? page.sessions.addTitle : t.creditTitle}
        description={
          session ? page.sessions.formDescription : page.credits.formDescription
        }
        closeLabel={page.form.close}
      >
        {session ? (
          <SessionForm
            masterId={action.masterId}
            session={null}
            onDone={done}
          />
        ) : (
          <ContributorForm
            masterId={action.masterId}
            contributor={null}
            initial={{
              name: action.name,
              role: action.role,
              contactId: action.contactId,
            }}
            onDone={done}
          />
        )}
      </FormDialog>
    </>
  );
}
