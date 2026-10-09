"use client";

import { useState } from "react";

import { useDraftSave } from "@/components/strategy/generator/use-draft-save";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";

const FIELDS = [
  { key: "artistText", page: "artist", max: 4000, rows: 6 },
  { key: "newsText", page: "news", max: 2000, rows: 3 },
  { key: "storyText", page: "story", max: 4000, rows: 6 },
  { key: "contactsText", page: "contacts", max: 1000, rows: 3 },
  { key: "pressInfoText", page: "press_info", max: 2000, rows: 3 },
] as const;
type Key = (typeof FIELDS)[number]["key"];

/**
 * The Dossier de presse's text (ticket § 12), prefilled by code from the
 * artist's sheet, the project and the validated Brief: the owner rereads and
 * retouches; an empty text leaves its page out.
 */
export function PressContentStep({
  projectId,
  values,
  nextHref,
}: {
  projectId: string;
  values: Record<Key, string>;
  nextHref: string;
}) {
  const t = fr.strategyDocs;
  const { pending, save } = useDraftSave(projectId, "press_kit");
  const [draft, setDraft] = useState(values);
  const hints: Partial<Record<Key, string>> = {
    contactsText: t.press.contactsHint,
    pressInfoText: t.press.pressInfoHint,
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-display-sm font-semibold">{t.press.introTitle}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.press.introBody}
        </p>
      </div>
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label htmlFor={`press-${field.key}`}>{t.pages[field.page]}</Label>
          {hints[field.key] && (
            <p className="text-caption text-muted-foreground">
              {hints[field.key]}
            </p>
          )}
          <Textarea
            id={`press-${field.key}`}
            value={draft[field.key]}
            maxLength={field.max}
            rows={field.rows}
            onChange={(e) =>
              setDraft((d) => ({ ...d, [field.key]: e.target.value }))
            }
          />
        </div>
      ))}
      <Button
        type="button"
        className="self-start"
        disabled={pending}
        onClick={() => save({ ...draft, contentConfirmed: true }, nextHref)}
      >
        {pending ? t.generator.saving : t.generator.validate}
      </Button>
    </section>
  );
}
