"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { DealCounterpartField } from "@/components/deals/deal-counterpart-field";
import { NewDealSubjectFields } from "@/components/deals/new-deal-subject-fields";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { createDeal } from "@/lib/deals/actions";
import type { NewDealOptions } from "@/lib/deals/new-deal-options";
import { DEAL_KINDS, type DealKind } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";

const fr = { deals };

type Missing =
  "participation" | "project" | "subject" | "artist" | "counterpart";

/**
 * « Nouveau deal » (BIZ 4): its kind first. A music deal is for an artist
 * of a collective (his participation, which names the project and the
 * title), else for a project and/or an artist; a label or brand deal names
 * its label or brand in the Réseau, the artist and the project beside it if
 * known (Ibé 18/11/2026) — always chosen among what exists; then the member
 * who negotiates it and, if known, the next action. Missing choices turn red
 * at the first try; the new deal's page opens.
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
  const [kind, setKind] = useState<DealKind>("music");
  const [counterpart, setCounterpart] = useState("");
  const [mode, setMode] = useState<"participation" | "other">(
    hasParticipations && !preset ? "participation" : "other",
  );
  const music = kind === "music";
  // A label or brand deal is never a participation's.
  const byParticipation = music && mode === "participation";
  const [participation, setParticipation] = useState("");
  const [project, setProject] = useState("");
  const [artist, setArtist] = useState(preset);
  // The artist the chosen project filled in, followed by another project
  // until someone picks an artist himself.
  const [filled, setFilled] = useState("");
  const [missing, setMissing] = useState<Missing[]>([]);
  const { pending, error, run } = useWriteSubmit(() => {
    onDone();
    if (created.current) router.push(routes.deal(created.current));
  }, fr.deals.done.created);

  const missingOf = (): Missing[] => {
    if (!music) return counterpart ? [] : ["counterpart"];
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
          document
            .querySelector<HTMLElement>(
              `#new-deal-${lacking[0]} input, #new-deal-${lacking[0]} button`,
            )
            ?.focus();
          return;
        }
        const data = new FormData(event.currentTarget);
        run(async () => {
          const result = await createDeal({
            kind,
            counterpartId: music ? null : counterpart,
            participationId: byParticipation ? participation : null,
            projectId: byParticipation ? null : project,
            artistId: byParticipation ? null : artist,
            assigneeId: String(data.get("assignee") ?? ""),
            nextAction: String(data.get("nextAction") ?? ""),
            nextActionOn: String(data.get("nextActionOn") ?? ""),
          });
          if (result.ok) created.current = result.dealId ?? null;
          return result;
        });
      }}
    >
      <ChipChoice
        name="kind"
        legend={t.kind}
        required
        fill
        options={DEAL_KINDS.map((value) => ({
          value,
          label: fr.deals.kinds[value],
        }))}
        value={kind}
        onChange={(v) => {
          if (v) setKind(v);
          // Another kind: its label or brand is chosen again.
          setCounterpart("");
          setMissing([]);
        }}
      />
      {!music && (
        <DealCounterpartField
          key={kind}
          kind={kind}
          error={
            missing.includes("counterpart")
              ? t.required.counterpart[kind]
              : undefined
          }
          onPick={(id) => {
            setCounterpart(id);
            setMissing([]);
          }}
        />
      )}
      {music && hasParticipations && (
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
      <NewDealSubjectFields
        options={options}
        music={music}
        byParticipation={byParticipation}
        values={{ participation, project, artist }}
        onChange={(field, value) => {
          ({
            participation: setParticipation,
            project: setProject,
            artist: setArtist,
          })[field](value);
          if (field === "project" && (!artist || artist === filled)) {
            // What PDS OS knows of the project: its artist, still changeable.
            const own = options.projectArtists[value] ?? "";
            setArtist(own || (artist === filled ? "" : artist));
            setFilled(own);
          }
          if (field === "artist") setFilled("");
          setMissing([]);
        }}
        missing={missing}
      />
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
