"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useDraftSave } from "@/components/strategy/release-plan/use-draft-save";
import { VisualTile } from "@/components/strategy/release-plan/visual-tile";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToneCallout } from "@/components/ui/tone-callout";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { GeneratorKind } from "@/lib/strategy/documents/generator-kind";
import type { VisualCandidate } from "@/lib/strategy/documents/release-plan-sources";
import {
  visualKey,
  type Visual,
} from "@/lib/strategy/documents/release-plan-model";
import {
  documentVisualUrl,
  uploadDocumentVisual,
} from "@/lib/strategy/documents/upload-visual";

const fr = { strategyReleasePlan };

const GROUPS = ["artist", "project", "uploads", "references"] as const;
const isReference = (url: string) => /^https:\/\/[^\s"'<>]+$/i.test(url);

/**
 * Step 4 (ticket § 11): « Passe-moi tes photos et références. » The images
 * already in the project and the artist's, images dropped here, visual
 * references by link; the owner checks those allowed in the document.
 */
export function VisualsStep({
  projectId,
  organizationId,
  candidates,
  initialSelected,
  nextHref,
  canEdit,
  kind = "release_plan",
}: {
  projectId: string;
  // The document whose draft keeps the choice.
  kind?: GeneratorKind;
  organizationId: string;
  candidates: VisualCandidate[];
  initialSelected: string[];
  nextHref: string;
  canEdit: boolean;
}) {
  const t = fr.strategyReleasePlan.visuals;
  const a = fr.strategyReleasePlan.actions;
  const { pending, save } = useDraftSave(projectId, kind);
  const [added, setAdded] = useState<VisualCandidate[]>([]);
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const [reference, setReference] = useState("");
  const [uploading, setUploading] = useState(false);
  const all = [...candidates, ...added];

  const toggle = (key: string) =>
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const add = (
    visual: Visual,
    previewUrl: string,
    group: VisualCandidate["group"],
  ) => {
    const key = visualKey(visual);
    if (all.some((c) => c.key === key)) return;
    setAdded((list) => [...list, { visual, key, previewUrl, group }]);
    setSelected((set) => new Set(set).add(key));
  };
  const upload = async (files: File[]) => {
    setUploading(true);
    for (const file of files) {
      const result = await uploadDocumentVisual({
        organizationId,
        projectId,
        file,
      });
      if (!result.ok) toast.error(result.error);
      else if (result.visual.source === "upload")
        add(result.visual, documentVisualUrl(result.visual.path), "uploads");
    }
    setUploading(false);
  };
  const submit = () => {
    // Kept: the images dropped and the references (always offered again),
    // and every image allowed in the document.
    const visuals = all
      .filter(
        (c) =>
          c.visual.source === "upload" ||
          c.visual.source === "reference" ||
          selected.has(c.key),
      )
      .map((c) => c.visual);
    save(
      {
        visuals,
        selected: [...selected].filter((k) => all.some((c) => c.key === k)),
        visualsConfirmed: true,
      },
      nextHref,
    );
  };

  return (
    <section aria-labelledby="visuals-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="visuals-title" className="text-display-sm font-semibold">
          {t.title}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.body}
        </p>
        <p className="text-caption text-muted-foreground">{t.hint}</p>
      </div>
      {all.length === 0 && <ToneCallout tone="neutral">{t.none}</ToneCallout>}
      {GROUPS.map((group) => {
        const items = all.filter((c) => c.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-3">
            <h3 className="text-body-md font-semibold">{t.groups[group]}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((c) => (
                <li key={c.key}>
                  <VisualTile
                    name={c.visual.name}
                    url={c.previewUrl}
                    selected={selected.has(c.key)}
                    disabled={!canEdit}
                    onToggle={() => toggle(c.key)}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {canEdit && (
        <div className="flex flex-col gap-4">
          <FileDropZone
            label={uploading ? t.uploading : t.upload}
            hint={t.uploadHint}
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            onFiles={(files) => void upload(files)}
          />
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const url = reference.trim();
              if (!isReference(url)) return toast.error(t.referenceInvalid);
              add(
                { source: "reference", url, name: url.slice(0, 200) },
                url,
                "references",
              );
              setReference("");
            }}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="visual-reference">{t.referenceLabel}</Label>
              <Input
                id="visual-reference"
                type="url"
                inputMode="url"
                value={reference}
                placeholder={t.referencePlaceholder}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              {t.addReference}
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={pending || uploading}
              onClick={submit}
            >
              {pending ? a.saving : a.validate}
            </Button>
            <span className="text-caption text-muted-foreground tabular-nums">
              {t.selected(selected.size)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
