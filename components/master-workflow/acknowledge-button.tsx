"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { acknowledgeMasterPackage } from "@/lib/master-workflow/transmission-public-actions";

/** "J'ai bien reçu le dossier", on the engineer's page: once; the label's
 * sender is notified, the page then reads the confirmation. */
export function AcknowledgeButton({ token }: { token: string }) {
  const t = fr.masterWorkflow.publicPackage;
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        size="lg"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          startTransition(async () => {
            const state = await acknowledgeMasterPackage(token);
            setFailed(state === "failed" || state === "unknown");
            router.refresh();
          })
        }
      >
        {pending ? t.acknowledging : t.acknowledge}
      </Button>
      {failed && <FormMessage kind="error">{t.failed}</FormMessage>}
    </div>
  );
}
