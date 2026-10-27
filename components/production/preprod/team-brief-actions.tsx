"use client";

import { TextareaField } from "@/components/auth/textarea-field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import {
  saveTeamBrief,
  transmitTeamBrief,
} from "@/lib/production/preprod/actions-briefs";
import {
  MAX_TEAM_FIELD,
  TEAM_FIELDS,
  type Team,
  type TeamBriefState,
  type TeamFields,
} from "@/lib/production/preprod/team-briefs";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";

const fr = { productionPreprod };

const t = fr.productionPreprod.briefs;

/** « Compléter » (the team's own fields) and « Transmettre » (confirmed). */
export function TeamBriefActions({
  projectId,
  deliverableId,
  sheetId,
  team,
  fields,
  state,
}: {
  projectId: string;
  deliverableId: string;
  sheetId: string;
  team: Team;
  fields: TeamFields;
  state: TeamBriefState;
}) {
  const label = t.teams[team];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DialogButton
        label={t.editAction}
        variant="ghost"
        title={t.editTitle(label)}
        description={t.editDescription}
      >
        {(close) => (
          <TeamBriefForm
            projectId={projectId}
            sheetId={sheetId}
            team={team}
            fields={fields}
            onDone={close}
          />
        )}
      </DialogButton>
      {state !== "transmitted" && (
        <ConfirmButton
          label={state === "outdated" ? t.retransmit : t.transmit}
          title={t.transmitTitle(label)}
          body={t.transmitBody}
          confirmLabel={state === "outdated" ? t.retransmit : t.transmit}
          pendingLabel={t.transmitting}
          done={t.transmitted}
          run={() => transmitTeamBrief({ projectId, deliverableId, team })}
        />
      )}
    </div>
  );
}

function TeamBriefForm({
  projectId,
  sheetId,
  team,
  fields,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  team: Team;
  fields: TeamFields;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const values = Object.fromEntries(
          TEAM_FIELDS[team].map((key) => [key, String(data.get(key) ?? "")]),
        );
        run(() => saveTeamBrief({ projectId, sheetId, team, fields: values }));
      }}
    >
      {TEAM_FIELDS[team].map((key) => (
        <TextareaField
          key={key}
          id={`team-brief-${team}-${key}`}
          name={key}
          label={t.fields[key]}
          rows={3}
          maxLength={MAX_TEAM_FIELD}
          defaultValue={fields[key] ?? ""}
        />
      ))}
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={fr.productionPreprod.save}
        onCancel={onDone}
      />
    </form>
  );
}
