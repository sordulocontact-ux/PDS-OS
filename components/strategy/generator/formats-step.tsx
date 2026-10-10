"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useState } from "react";

import { useDraftSave } from "@/components/strategy/generator/use-draft-save";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MoveButtons } from "@/components/ui/move-buttons";
import { fr } from "@/lib/i18n/fr";
import type { Format } from "@/lib/strategy/documents/model";
import { move } from "@/lib/utils/move";

/**
 * Step 3 (ticket § 11): the contents and formats, taken from the validated
 * deliverables. Keep, leave out, rename or specify, without typing them again.
 */
export function FormatsStep({
  projectId,
  initial,
  nextHref,
}: {
  projectId: string;
  initial: Format[];
  nextHref: string;
}) {
  const t = fr.strategyDocs.plan;
  const g = fr.strategyDocs.generator;
  const { pending, save } = useDraftSave(projectId, "release_plan");
  const [formats, setFormats] = useState(initial);
  const update = (id: string, patch: Partial<Format>) =>
    setFormats((list) =>
      list.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-display-sm font-semibold">{t.formatsTitle}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.formatsBody}
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {formats.map((format, index) => (
          <li
            key={format.id}
            className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
          >
            <label className="flex items-center gap-2 text-caption text-muted-foreground">
              <Checkbox
                checked={format.include}
                onChange={() => update(format.id, { include: !format.include })}
              />
              {t.include}
            </label>
            <Input
              aria-label={fr.strategy.deliverables.name}
              value={format.title}
              maxLength={200}
              onChange={(e) => update(format.id, { title: e.target.value })}
            />
            <Input
              aria-label={t.formatNote}
              placeholder={t.formatNote}
              value={format.note}
              maxLength={300}
              onChange={(e) => update(format.id, { note: e.target.value })}
            />
            <span className="flex items-center">
              <MoveButtons
                upLabel={g.moveUpLabel(format.title)}
                downLabel={g.moveDownLabel(format.title)}
                first={index === 0}
                last={index === formats.length - 1}
                onMove={(delta) => setFormats((l) => move(l, index, delta))}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={g.removeLabel(format.title)}
                onClick={() =>
                  setFormats((l) => l.filter((f) => f.id !== format.id))
                }
              >
                <IconTrash aria-hidden className="size-4" />
              </Button>
            </span>
          </li>
        ))}
      </ol>
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
          {g.add}
        </Button>
        <Button
          type="button"
          disabled={pending || formats.some((f) => f.title.trim() === "")}
          onClick={() => save({ formats, formatsConfirmed: true }, nextHref)}
        >
          {pending ? g.saving : g.validate}
        </Button>
      </div>
    </section>
  );
}
