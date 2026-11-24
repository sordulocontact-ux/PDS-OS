"use client";

import dynamic from "next/dynamic";
import {
  IconCalendarDays,
  IconEnvelopeOpen,
  IconOffice,
} from "nucleo-sharp-essential";
import { useState } from "react";

import { MeetingForm } from "@/components/calls/new-meeting-button";
import { emptyDraft } from "@/components/mailbox/mail-compose-draft";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { NameChip, NameChips } from "@/components/ui/name-chip";
import { loadMeetingForm } from "@/lib/assistant/draft-record-actions";
import { network } from "@/lib/i18n/fr/network";
import {
  relationsText,
  rolesText,
  type NetworkContactRow,
} from "@/lib/network/types";

const MailComposeDialog = dynamic(() =>
  import("@/components/mailbox/mail-compose-dialog").then(
    (m) => m.MailComposeDialog,
  ),
);

const fr = { network };

/**
 * The top of a contact's side sheet (after Accordee): its picture, its name
 * large, what it does and where, its relations as pills, then the gestures
 * one makes with it: an e-mail from PDS OS, a meeting it is invited to.
 */
export function SheetIdentity({ contact }: { contact: NetworkContactRow }) {
  const t = fr.network;
  const s = t.sheet;
  const [writing, setWriting] = useState(false);
  const roles = rolesText(contact.roles);
  const relations = relationsText(contact.relations);

  return (
    <div className="flex flex-col gap-4">
      <Avatar
        name={contact.name}
        pictureUrl={contact.pictureUrl}
        className="size-16 text-[length:var(--type-body-lg)]"
      />
      <div className="flex flex-col gap-1">
        <p className="text-display-sm font-medium break-words">
          {contact.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[color:var(--text-secondary)]">
          <span>{roles || t.kinds[contact.kind]}</span>
          {contact.parentName && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <IconOffice aria-hidden className="size-4 shrink-0" />
                <span className="truncate">{contact.parentName}</span>
              </span>
            </>
          )}
        </p>
      </div>
      {relations && (
        <NameChips>
          {contact.relations.map((relation) => (
            <NameChip key={relation} name={t.relations[relation]} />
          ))}
        </NameChips>
      )}
      <div className="flex flex-wrap gap-2">
        {contact.email && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWriting(true)}
          >
            <IconEnvelopeOpen aria-hidden data-icon="inline-start" />
            {s.email}
          </Button>
        )}
        <LoadedFormButton
          label={s.meeting}
          icon={IconCalendarDays}
          variant="outline"
          size="sm"
          dialogSize="wide"
          title={s.meetingTitle}
          description={s.meetingDescription}
          closeLabel={t.form.close}
          load={loadMeetingForm}
        >
          {(data, close) => (
            <MeetingForm
              {...data}
              defaultContactIds={[contact.id]}
              onCancel={close}
            />
          )}
        </LoadedFormButton>
      </div>
      {writing && contact.email && (
        <MailComposeDialog
          open={writing}
          onOpenChange={setWriting}
          draft={{
            ...emptyDraft,
            envelope: { ...emptyDraft.envelope, to: contact.email },
          }}
        />
      )}
    </div>
  );
}
