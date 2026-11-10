"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useState } from "react";

import { useDraftSave } from "@/components/strategy/release-plan/use-draft-save";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoveButtons } from "@/components/ui/move-buttons";
import { ToneCallout } from "@/components/ui/tone-callout";
import { StepSection } from "@/components/shell/journey/step-section";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { Format } from "@/lib/strategy/documents/release-plan-model";
import { move } from "@/lib/utils/move";

const fr = { strategyReleasePlan };

/**
 * Step 3 (ticket § 11): the contents the document presents, taken from the
 * validated deliverables (title × quantity). Keep, leave out, specify or
 * add without retyping.
 */
export function FormatsStep({
  projectId,
  initial,
  nextHref,
  canEdit,
}: {
  projectId: string;
  initial: Format[];
  nextHref: string;
  canEdit: boolean;
}) {
  const t = fr.strategyReleasePlan.formats;
  const a = fr.strategyReleasePlan.actions;
  const { pending, save } = useDraftSave(projectId);
  const [formats, setFormats] = useState(initial);
  const update = (id: string, patch: Partial<Format>) =>
    setFormats((list) =>
      list.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );

  return (
    <StepSection title={t.title} description={t.body}>
      <div className="flex flex-col gap-6">
        {formats.length === 0 && (
          <ToneCallout tone="neutral">{t.none}</ToneCallout>
        )}
        <ol className="flex flex-col gap-3">
          {formats.map((format, index) => (
            <li
              key={format.id}
              className="flex flex-col gap-3 rounded-2xl border border-border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-body-md font-medium">
                  <Checkbox
                    checked={format.include}
                    disabled={!canEdit}
                    onChange={(e) =>
                      update(format.id, { include: e.target.checked })
                    }
                  />
                  {t.include}
                </label>
                {canEdit && (
                  <span className="flex items-center gap-1">
                    <MoveButtons
                      upLabel={a.moveUpLabel(format.title)}
                      downLabel={a.moveDownLabel(format.title)}
                      first={index === 0}
                      last={index === formats.length - 1}
                      onMove={(delta) =>
                        setFormats((l) => move(l, index, delta))
                      }
                    />
                    {!format.deliverableId && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={a.removeLabel(format.title)}
                        onClick={() =>
                          setFormats((l) => l.filter((f) => f.id !== format.id))
                        }
                      >
                        <IconTrash aria-hidden className="size-4" />
                      </Button>
                    )}
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`format-${format.id}-title`}>{t.label}</Label>
                  <Input
                    id={`format-${format.id}-title`}
                    value={format.title}
                    maxLength={200}
                    disabled={!canEdit}
                    onChange={(e) =>
                      update(format.id, { title: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`format-${format.id}-note`}>{t.note}</Label>
                  <Input
                    id={`format-${format.id}-note`}
                    value={format.note}
                    maxLength={300}
                    disabled={!canEdit}
                    onChange={(e) =>
                      update(format.id, { note: e.target.value })
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={formats.length >= 40}
              onClick={() =>
                setFormats((l) => [
                  ...l,
                  {
                    id: `format-${Date.now().toString(36)}`,
                    deliverableId: null,
                    title: t.newFormat,
                    note: "",
                    include: true,
                  },
                ])
              }
            >
              {a.add}
            </Button>
            <Button
              type="button"
              disabled={pending || formats.some((f) => f.title.trim() === "")}
              onClick={() =>
                save({ formats, formatsConfirmed: true }, nextHref)
              }
            >
              {pending ? a.saving : a.validate}
            </Button>
          </div>
        )}
      </div>
    </StepSection>
  );
}
