"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { liftReserve } from "@/lib/marketing/closure/reserve-actions";

const t = fr.reviewJourney.reserves;

/** « Ce qui l'a levée » and « Marquer levée » under a reserve to lift
 * before the closing (proto `rlift`). */
export function ReserveLiftInline({
  projectId,
  reserveId,
}: {
  projectId: string;
  reserveId: string;
}) {
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setMissing(false),
    t.lifted,
  );
  const id = `lift-${reserveId}`;
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const note = String(
          new FormData(event.currentTarget).get("note") ?? "",
        ).trim();
        setMissing(!note);
        if (!note) {
          document.getElementById(id)?.focus();
          return;
        }
        run(() => liftReserve({ projectId, reserveId, note }));
      }}
    >
      <Field
        id={id}
        name="note"
        label={t.lift}
        required
        maxLength={1000}
        error={missing ? t.liftRequired : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.markLifted}
        </Button>
      </div>
    </form>
  );
}
