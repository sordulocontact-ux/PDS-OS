"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { masterSource } from "@/lib/i18n/fr/master-source";
import { replaceSource } from "@/lib/master-workflow/source-actions";

const fr = { masterSource };

const t = fr.masterSource.newer;

/** « Remplacer la source et prévenir Karim » (proto `master:vocals`). */
export function ReplaceSourceButton({
  projectId,
  masterId,
  fileId,
  engineer,
}: {
  projectId: string;
  masterId: string;
  fileId: string;
  engineer: string | null;
}) {
  const submit = useWriteSubmit(() => undefined, t.done);
  return (
    <div className="flex flex-col gap-2">
      <FormMessage kind="error">{submit.error}</FormMessage>
      <Button
        type="button"
        className="self-start"
        disabled={submit.pending}
        aria-busy={submit.pending || undefined}
        onClick={() =>
          submit.run(() => replaceSource({ projectId, masterId, fileId }))
        }
      >
        {t.replace(engineer)}
      </Button>
    </div>
  );
}
