"use client";

import { SinglePicker } from "@/components/catalog/single-picker";
import type { NewDealOptions } from "@/lib/deals/new-deal-options";
import { deals } from "@/lib/i18n/fr/deals";
import { cn } from "@/lib/utils";

const fr = { deals };

export type NewDealSubject = "participation" | "project" | "artist";

const optionsOf = (list: Record<string, string>) =>
  Object.entries(list).map(([id, label]) => ({ id, label }));

/**
 * What a new deal is about (BIZ 4): a participation of a collective, else a
 * project and/or an artist. Each is searched, then shown as a card with a ✕
 * that takes it back (Sacha 20/11/2026: an optional choice must be
 * removable, like the label or brand above it). For a music deal they are
 * required as the database asks (the direction may name an artist alone, a
 * project manager his project, the business manager an artist); beside a
 * label or a brand they are optional (Ibé 18/11/2026). `missing`: the
 * form's missing choices, in red. Each field sits in a `#new-deal-…` box
 * the form focuses.
 */
export function NewDealSubjectFields({
  options,
  music,
  byParticipation,
  values,
  onChange,
  missing,
}: {
  options: NewDealOptions;
  music: boolean;
  byParticipation: boolean;
  values: Record<NewDealSubject, string>;
  onChange: (field: NewDealSubject, value: string) => void;
  missing: string[];
}) {
  const t = fr.deals.create;
  const projectRequired = music && !options.artistAlone;
  const artistRequired = music && options.own;
  const common = {
    noResultLabel: t.noResult,
    allSelectedLabel: t.allSelected,
    removeLabel: t.remove,
  };

  if (byParticipation)
    return (
      <div id="new-deal-participation" className="flex flex-col gap-1.5">
        <SinglePicker
          {...common}
          name="participationId"
          legend={t.participation}
          required
          options={optionsOf(options.participations)}
          selectedId={values.participation || null}
          onSelect={(id) => onChange("participation", id ?? "")}
          searchLabel={t.participationSearch}
          placeholder={t.participationPlaceholder}
          error={
            missing.includes("participation")
              ? t.required.participation
              : undefined
          }
        />
        {!missing.includes("participation") && (
          <p className="text-xs text-muted-foreground">{t.participationHint}</p>
        )}
      </div>
    );

  const projectError = missing.includes("project")
    ? t.required.project
    : missing.includes("subject")
      ? t.required.subject
      : undefined;
  return (
    <>
      {/* The business manager opens a deal without a project. */}
      <div
        id={options.artistAlone ? "new-deal-subject" : "new-deal-project"}
        className={cn(options.own && "hidden")}
      >
        <SinglePicker
          {...common}
          name="projectId"
          legend={t.project}
          required={projectRequired}
          options={optionsOf(options.projects)}
          selectedId={values.project || null}
          onSelect={(id) => onChange("project", id ?? "")}
          searchLabel={t.projectSearch}
          placeholder={t.projectPlaceholder}
          error={music ? projectError : undefined}
        />
      </div>
      <div id="new-deal-artist">
        <SinglePicker
          {...common}
          name="artistId"
          legend={t.artist}
          required={artistRequired}
          options={optionsOf(options.artists)}
          selectedId={values.artist || null}
          onSelect={(id) => onChange("artist", id ?? "")}
          searchLabel={t.artistSearch}
          placeholder={t.artistPlaceholder}
          error={
            artistRequired && missing.length > 0 ? t.required.artist : undefined
          }
        />
      </div>
    </>
  );
}
