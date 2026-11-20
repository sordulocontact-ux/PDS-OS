"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { AgendaList } from "@/components/calls/prep/agenda-list";
import { PageSection } from "@/components/shell/page-section";
import type { AgendaDraftItem } from "@/components/calls/prep/use-agenda-draft";
import { Button } from "@/components/ui/button";
import { updateCallAgenda } from "@/lib/calls/actions";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { EXTRA_TOPIC_MINUTES } from "@/lib/calls/prepare";
import { calls } from "@/lib/i18n/fr/calls";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { calls, framingIntel };

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
  const [touched, setTouched] = useState(false);
  const [draft, setDraft] = useState<AgendaDraftItem[]>([]);
  const [pending, setPending] = useState(false);
  // The points as the common agenda editor holds them; questions and the
  // Cadrage dimension of each point stay with it, by id.
  const toDraft = () =>
    agenda.map((item, index) => ({
      id: `a${index}`,
      key: null,
      topic: item.topic,
      minutes: item.minutes,
      questions: item.questions ?? [],
    }));
  const fromDraft = (items: AgendaDraftItem[]): AgendaItem[] =>
    items.map((item) => {
      const index = item.id.startsWith("a") ? Number(item.id.slice(1)) : -1;
      const before = agenda[index];
      return {
        topic: item.topic.trim(),
        minutes: item.minutes ?? EXTRA_TOPIC_MINUTES,
        ...(before?.questions?.length ? { questions: before.questions } : {}),
        ...(before?.dimension ? { dimension: before.dimension } : {}),
      };
    });

  if (!editing) {
    return (
      // Folded until it is opened (Sacha 20/11/2026); open again after an
      // edit, where it was. Keyed so each mode starts with its own state.
      <PageSection
        key={touched ? "read-open" : "read"}
        id="call-agenda"
        title={t.title}
        collapsible
        defaultOpen={touched}
        description={
          durationMinutes !== null ? t.total(durationMinutes) : undefined
        }
        action={
          canEdit && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(toDraft());
                setEditing(true);
                setTouched(true);
              }}
            >
              {t.edit}
            </Button>
          )
        }
        card
      >
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
      </PageSection>
    );
  }

  const save = async () => {
    setPending(true);
    const result = await updateCallAgenda(callId, fromDraft(draft));
    setPending(false);
    if (result.ok) setEditing(false);
    else toast.error(fr.calls.errors[result.error]);
  };

  return (
    <PageSection key="edit" id="call-agenda" title={t.title} card>
      <AgendaList
        id={`agenda-${callId}`}
        items={draft}
        onChange={setDraft}
        onAdd={(topic) =>
          setDraft([
            ...draft,
            {
              id: `n${draft.length}-${Date.now()}`,
              key: null,
              topic,
              minutes: null,
              questions: [],
            },
          ])
        }
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
    </PageSection>
  );
}
