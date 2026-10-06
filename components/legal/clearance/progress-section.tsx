"use client";

import { useState } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { advanceClearance } from "@/lib/legal/clearance/actions";
import {
  CLEARANCE_EXCEPTIONS,
  isClosed,
  missingLabel,
} from "@/lib/legal/clearance/matrix";
import type { Clearance } from "@/lib/legal/clearance/types";

import { useLegalAction } from "@/components/legal/use-legal-action";

/** The next step and what it still needs (the database checks it again),
 * and the exceptions, each with its reason. */
export function ProgressSection({
  projectId,
  clearance,
}: {
  projectId: string;
  clearance: Clearance;
}) {
  const t = fr.legalClearance;
  const [exception, setException] = useState<
    (typeof CLEARANCE_EXCEPTIONS)[number] | null
  >(null);
  const [note, setNote] = useState("");
  const { pending, run } = useLegalAction();
  if (isClosed(clearance.status)) return null;
  const next = clearance.next;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-medium">{t.drawer.progress}</h3>
      {next && clearance.missing.length > 0 && (
        <ToneCallout tone="warning">
          {t.drawer.needs} {clearance.missing.map(missingLabel).join(" · ")}
        </ToneCallout>
      )}
      <div className="flex flex-wrap gap-2">
        {next && (
          <Button
            size="sm"
            disabled={pending || clearance.missing.length > 0}
            onClick={() =>
              run(() =>
                advanceClearance({
                  projectId,
                  clearanceId: clearance.id,
                  status: next,
                  note: "",
                }),
              )
            }
          >
            {t.drawer.moveTo(t.statuses[next])}
          </Button>
        )}
        {CLEARANCE_EXCEPTIONS.filter((e) => e !== clearance.status).map((e) => (
          <Button
            key={e}
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setException(e)}
          >
            {t.drawer.exceptions[e]}
          </Button>
        ))}
      </div>
      {exception && (
        <div className="flex flex-col gap-2">
          <TextareaField
            name={`note-${clearance.id}`}
            label={`${t.drawer.exceptions[exception]} · ${t.drawer.exceptionNote}`}
            rows={2}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setException(null)}
            >
              {fr.legalSplits.public.cancel}
            </Button>
            <Button
              size="sm"
              disabled={pending || !note.trim()}
              onClick={() =>
                run(
                  () =>
                    advanceClearance({
                      projectId,
                      clearanceId: clearance.id,
                      status: exception,
                      note,
                    }),
                  () => {
                    setException(null);
                    setNote("");
                  },
                )
              }
            >
              {t.drawer.confirmException}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
