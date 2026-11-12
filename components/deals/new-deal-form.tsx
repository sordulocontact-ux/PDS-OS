"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { SearchSelect } from "@/components/ui/search-select";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { createDeal } from "@/lib/deals/actions";
import type { NewDealOptions } from "@/lib/deals/new-deal-options";
import { deals } from "@/lib/i18n/fr/deals";
import { cn } from "@/lib/utils";

const fr = { deals };

type Missing = "participation" | "project" | "subject" | "artist";

/**
 * « Nouveau deal » (BIZ 4): for an artist of a collective (his
 * participation, which names the project and the title), else for a
 * project and/or an artist — always chosen among what exists; then the
 * member who negotiates it and, if known, the next action. Missing choices
 * turn red at the first try; the new deal's page opens.
 */
export function NewDealForm({
  options,
  artistId = null,
  onDone,
}: {
  options: NewDealOptions;
  // An artist already chosen (a new deal after an abandoned one).
  artistId?: string | null;
  onDone: () => void;
}) {
  const t = fr.deals.create;
  const router = useRouter();
  const created = useRef<string | null>(null);
  const hasParticipations = Object.keys(options.participations).length > 0;
  const preset = artistId && options.artists[artistId] ? artistId : "";
  const [mode, setMode] = useState<"participation" | "other">(
    hasParticipations && !preset ? "participation" : "other",
  );
  const [participation, setParticipation] = useState("");
  const [project, setProject] = useState("");
  const [artist, setArtist] = useState(preset);
  const [missing, setMissing] = useState<Missing[]>([]);
  const { pending, error, run } = useWriteSubmit(() => {
    onDone();
    if (created.current) router.push(routes.deal(created.current));
  }, fr.deals.done.created);

  const missingOf = (): Missing[] => {
    if (mode === "participation") return participation ? [] : ["participation"];
    if (!options.artistAlone && !project) return ["project"];
    if (options.own) return artist ? [] : ["artist"];
    return project || artist ? [] : ["subject"];
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const lacking = missingOf();
        setMissing(lacking);
        if (lacking.length > 0) {
          document.getElementById(`new-deal-${lacking[0]}`)?.focus();
          return;
        }
        const data = new FormData(event.currentTarget);
        run(async () => {
          const result = await createDeal({
            participationId: mode === "participation" ? participation : null,
            projectId: mode === "other" ? project : null,
            artistId: mode === "other" ? artist : null,
            assigneeId: String(data.get("assignee") ?? ""),
            nextAction: String(data.get("nextAction") ?? ""),
            nextActionOn: String(data.get("nextActionOn") ?? ""),
          });
          if (result.ok) created.current = result.dealId ?? null;
          return result;
        });
      }}
    >
      {hasParticipations && (
        <ChipChoice
          name="for"
          legend={t.for}
          required
          fill
          options={[
            { value: "participation" as const, label: t.forParticipation },
            { value: "other" as const, label: t.forOther },
          ]}
          value={mode}
          onChange={(v) => {
            if (v) setMode(v);
            setMissing([]);
          }}
        />
      )}
      {mode === "participation" ? (
        <div className="flex flex-col gap-1.5">
          <SearchSelect
            id="new-deal-participation"
            label={t.participation}
            options={options.participations}
            value={participation}
            onChange={(v) => {
              setParticipation(v);
              setMissing([]);
            }}
            placeholder={t.participationPlaceholder}
            searchPlaceholder={t.participationSearch}
            emptyLabel={t.participationEmpty}
            required
            invalid={missing.includes("participation")}
            describedBy="new-deal-participation-error"
            fill
          />
          {missing.includes("participation") ? (
            <FieldError id="new-deal-participation-error">
              {t.required.participation}
            </FieldError>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t.participationHint}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* The business manager opens an artist's deal: no project. */}
          <div className={cn("flex flex-col gap-1.5", options.own && "hidden")}>
            <SearchSelect
              id={options.artistAlone ? "new-deal-subject" : "new-deal-project"}
              label={t.project}
              options={options.projects}
              value={project}
              onChange={(v) => {
                setProject(v);
                setMissing([]);
              }}
              placeholder={t.projectPlaceholder}
              searchPlaceholder={t.projectSearch}
              emptyLabel={t.projectEmpty}
              required={!options.artistAlone}
              invalid={missing.length > 0}
              describedBy="new-deal-subject-error"
              fill
            />
            <FieldError id="new-deal-subject-error">
              {missing.includes("project")
                ? t.required.project
                : missing.includes("subject")
                  ? t.required.subject
                  : undefined}
            </FieldError>
          </div>
          <div className="flex flex-col gap-1.5">
            <SearchSelect
              id="new-deal-artist"
              label={t.artist}
              options={options.artists}
              value={artist}
              onChange={(v) => {
                setArtist(v);
                setMissing([]);
              }}
              placeholder={t.artistPlaceholder}
              searchPlaceholder={t.artistSearch}
              emptyLabel={t.artistEmpty}
              required={options.own}
              invalid={options.own && missing.length > 0}
              describedBy={options.own ? "new-deal-artist-error" : undefined}
              fill
            />
            {options.own && (
              <FieldError id="new-deal-artist-error">
                {missing.length > 0 ? t.required.artist : undefined}
              </FieldError>
            )}
          </div>
        </>
      )}
      {/* His own deal: nobody else to give it to (dialog's description). */}
      {!options.own && (
        <OptionSelect
          id="new-deal-assignee"
          name="assignee"
          label={t.assignee}
          hint={t.assigneeHint}
          items={options.negotiators}
        />
      )}
      <Field
        id="new-deal-next"
        name="nextAction"
        label={t.nextAction}
        maxLength={500}
      />
      <Field
        id="new-deal-next-on"
        name="nextActionOn"
        type="date"
        label={t.nextActionOn}
      />
      {missing.length > 0 && (
        <FormMessage kind="error">{t.missingCount(missing.length)}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
