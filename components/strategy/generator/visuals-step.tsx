"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { AddFilesDialog } from "@/components/catalog/files/add-files-dialog";
import { ThemeFields } from "@/components/strategy/generator/theme-fields";
import { useDraftSave } from "@/components/strategy/generator/use-draft-save";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { Theme, Visual } from "@/lib/strategy/documents/model";
import type { VisualCandidate } from "@/lib/strategy/documents/sources";
import { cn } from "@/lib/utils";

const GROUPS = ["artist", "project", "artistFiles"] as const;

/**
 * « Passe-moi tes photos et références » (ticket § 11, step 4; § 12): the
 * images already in the project, the title, the artist's sheet, or dropped
 * here into the project's files. Only the checked ones may appear in the
 * document, and are published with it. The Dossier de presse also picks its
 * direction here.
 */
export function VisualsStep({
  projectId,
  organizationId,
  kind,
  candidates,
  initial,
  direction,
  nextHref,
}: {
  projectId: string;
  organizationId: string;
  kind: "release_plan" | "press_kit";
  candidates: VisualCandidate[];
  initial: Visual[];
  // Dossier de presse: its theme and accent, chosen with the visuals.
  direction?: { theme: Theme; accent: string };
  nextHref: string;
}) {
  const t = fr.strategyDocs.plan;
  const g = fr.strategyDocs.generator;
  const router = useRouter();
  const { pending, save } = useDraftSave(projectId, kind);
  const keyOf = (v: Pick<Visual, "source" | "id">) => `${v.source}:${v.id}`;
  const [selected, setSelected] = useState(() => new Set(initial.map(keyOf)));
  const [look, setLook] = useState(direction);
  const [files, setFiles] = useState<File[] | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const toggle = (key: string) =>
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const chosen = candidates
    .filter((c) => selected.has(keyOf(c)))
    .map(({ source, id, name }) => ({ source, id, name: name.slice(0, 200) }));

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-display-sm font-semibold">{t.visualsTitle}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.visualsBody} {t.visualsHint}
        </p>
      </div>

      {candidates.length === 0 && (
        <ToneCallout tone="neutral">{t.noVisuals}</ToneCallout>
      )}
      {GROUPS.map((group) => {
        const items = candidates.filter((c) => c.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-3">
            <h3 className="text-body-md font-semibold">{t.sources[group]}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((c) => {
                const key = keyOf(c);
                const on = selected.has(key);
                return (
                  <li key={key}>
                    <label
                      className={cn(
                        "relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-2 transition-[border-color] duration-[var(--duration-fast)]",
                        on
                          ? "border-[var(--selection-border)]"
                          : "border-border",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => toggle(key)}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL */}
                      <img
                        src={c.previewUrl}
                        alt=""
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                      <span className="truncate text-caption">{c.name}</span>
                      {on && (
                        <span className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-foreground text-background">
                          <IconCheck aria-hidden className="size-3.5" />
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const list = [...(e.target.files ?? [])];
            e.target.value = "";
            if (list.length) setFiles(list);
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => input.current?.click()}
        >
          {t.upload}
        </Button>
        <AddFilesDialog
          organizationId={organizationId}
          owner={{ kind: "project", id: projectId }}
          files={files}
          mode={{ kind: "library", suggested: "visual" }}
          onClose={() => setFiles(null)}
          onAdded={() => {
            setFiles(null);
            router.refresh();
          }}
        />
      </div>

      {look && (
        <div className="flex flex-col gap-3">
          <h3 className="text-body-md font-semibold">{t.directionTitle}</h3>
          <ThemeFields
            idPrefix={`${kind}-direction`}
            theme={look.theme}
            accent={look.accent}
            onChange={setLook}
          />
        </div>
      )}

      <Button
        type="button"
        className="self-start"
        disabled={pending}
        onClick={() =>
          save(
            {
              visuals: chosen,
              visualsConfirmed: true,
              ...(look ? { direction: { ...look, accepted: true } } : {}),
            },
            nextHref,
          )
        }
      >
        {pending ? g.saving : g.validate}
      </Button>
    </section>
  );
}
