"use client";

import { useState } from "react";
import { toast } from "sonner";

import { AgendaEditor, cleanAgenda } from "@/components/calls/agenda-editor";
import { Button } from "@/components/ui/button";
import { updateCallAgenda } from "@/lib/calls/actions";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { fr } from "@/lib/i18n/fr";

const day = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/**
 * Points to cover and their approximate time, prepared before the call.
 * Editable until the call is recorded (PROJ-UX-03): points and their
 * questions written, added, removed, put in order; the total is always the
 * sum of the points; the last change says who and when.
 */
export function CallAgenda({
  callId,
  agenda,
  durationMinutes,
  canEdit,
  edited = null,
}: {
  callId: string;
  agenda: AgendaItem[];
  durationMinutes: number | null;
  canEdit: boolean;
  edited?: { at: string; by: string | null } | null;
}) {
  const t = fr.calls.agenda;
  const dimensions = fr.framingIntel.dimensions;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(agenda);
  const [pending, setPending] = useState(false);

  if (!editing) {
    return (
      <div className="grid gap-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium">{t.title}</h3>
          {canEdit && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(agenda);
                setEditing(true);
              }}
            >
              {t.edit}
            </Button>
          )}
        </div>
        {durationMinutes !== null && (
          <p className="text-xs text-muted-foreground">
            {t.total(durationMinutes)}
          </p>
        )}
        {edited && (
          <p className="text-xs text-muted-foreground">
            {t.edited(edited.by, day.format(new Date(edited.at)))}
          </p>
        )}
        <ol className="grid list-decimal gap-2 pl-5 text-sm">
          {agenda.map((item, index) => (
            <li key={index}>
              <span className="flex items-baseline justify-between gap-3">
                <span>{item.topic}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t.duration(item.minutes)}
                </span>
              </span>
              {item.dimension && item.dimension in dimensions && (
                <span className="text-xs text-muted-foreground">
                  {t.feeds(
                    dimensions[item.dimension as keyof typeof dimensions],
                  )}
                </span>
              )}
              {item.questions && item.questions.length > 0 && (
                <ul className="mt-1 grid list-disc gap-0.5 pl-5 text-xs text-muted-foreground">
                  {item.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const save = async () => {
    setPending(true);
    const result = await updateCallAgenda(callId, cleanAgenda(draft));
    setPending(false);
    if (result.ok) setEditing(false);
    else toast.error(fr.calls.errors[result.error]);
  };

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium">{t.title}</h3>
      <AgendaEditor
        value={draft}
        onChange={setDraft}
        idPrefix={`agenda-${callId}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
          {t.cancel}
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );
}
