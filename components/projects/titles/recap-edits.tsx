"use client";

import { IconMsgs, IconPenWriting2, IconPhone } from "nucleo-sharp-essential";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { NegotiationCallButton } from "@/components/deals/negotiation-call-button";
import { PersonPickerField } from "@/components/network/person-picker-field";
import {
  caption,
  factsClass,
  muted,
} from "@/components/projects/titles/recap-facts";
import { Button, buttonVariants } from "@/components/ui/button";
import { EMPTY_CELL } from "@/components/ui/data-table";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  negotiationCallData,
  type SharedNegotiationCall,
} from "@/lib/deals/negotiation-call-rules";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { listNetworkPeople } from "@/lib/network/people-actions";
import {
  createParticipationContact,
  setContactPhone,
  setParticipationContact,
  setParticipationNote,
} from "@/lib/projects/participation-actions";
import type { RecapAccord, RecapContact } from "@/lib/projects/recap-rules";
import { cn } from "@/lib/utils";

// What the collective's recap edits in place (retours d'Ibé du 18/11/2026,
// lot 2: « contact, sortie oui / non, notes », nothing that has a module):
// the release of a title, the note and the manager's contact of an artist,
// and « Caler le call » (Sacha's NegotiationCallButton). Each one sits in a
// row whose DataTableLink covers it: `relative z-10`.

const fr = { dialogs, projectTitles };

const LINE_BUTTON =
  "relative z-10 max-w-full truncate rounded-sm text-left outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

// ----------------------------------------------------------------- Release

export type ReleaseValue = "yes" | "no" | "undecided";

export const releaseValueOf = (decision: boolean | null): ReleaseValue =>
  decision === true ? "yes" : decision === false ? "no" : "undecided";

/** « Sortie » of a title: Oui / Non / Pas décidé, saved at the click
 * (setTitleRelease, by the board); read only, its word. */
export function ReleaseChoice({
  label,
  value,
  canEdit,
  pending,
  onPick,
}: {
  label: string;
  value: ReleaseValue;
  canEdit: boolean;
  pending: boolean;
  onPick: (value: ReleaseValue) => void;
}) {
  const t = fr.projectTitles.recap.release;
  if (!canEdit)
    return (
      <span className="text-[color:var(--text-secondary)]">{t[value]}</span>
    );
  return (
    <SegmentedControl<ReleaseValue>
      aria-label={t.label(label)}
      className="relative z-10"
      options={[
        { value: "yes", label: t.yes },
        { value: "no", label: t.no },
        { value: "undecided", label: t.undecided },
      ]}
      value={value}
      onChange={(next) => next && next !== value && !pending && onPick(next)}
    />
  );
}

// -------------------------------------------------------------------- Note

/** The artist's note under its name, on one line (the whole note on
 * hover); clicked, it opens to be changed. Empty: « Ajouter une note » for
 * whoever writes the title, nothing for the others. */
export function NoteLine({
  projectId,
  participationId,
  artist,
  note,
  canEdit,
}: {
  projectId: string;
  participationId: string;
  artist: string;
  note: string | null;
  canEdit: boolean;
}) {
  const t = fr.projectTitles.recap.note;
  const [open, setOpen] = useState(false);
  if (!canEdit)
    return note ? (
      <span
        className={cn(caption, "truncate text-[color:var(--text-secondary)]")}
        title={note}
      >
        {note}
      </span>
    ) : null;
  return (
    <>
      <button
        type="button"
        className={cn(
          caption,
          LINE_BUTTON,
          note && "text-[color:var(--text-secondary)]",
        )}
        title={note ?? undefined}
        onClick={() => setOpen(true)}
      >
        {/* The note itself is read, after what the button does. */}
        {note && <span className="sr-only">{`${t.edit(artist)} : `}</span>}
        {note ?? t.add}
        {!note && <span className="sr-only">{` · ${artist}`}</span>}
      </button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title(artist)}
        closeLabel={fr.dialogs.close}
      >
        <NoteForm
          projectId={projectId}
          participationId={participationId}
          note={note}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function NoteForm({
  projectId,
  participationId,
  note,
  onDone,
}: {
  projectId: string;
  participationId: string;
  note: string | null;
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap.note;
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(
          new FormData(event.currentTarget).get("note") ?? "",
        ).trim();
        run(() =>
          setParticipationNote({
            projectId,
            participationId,
            note: value || null,
          }),
        );
      }}
    >
      <TextareaField
        name="note"
        label={t.label}
        hideLabel
        defaultValue={note ?? ""}
        rows={4}
        maxLength={2000}
        autoFocus
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}

// ----------------------------------------------------------------- Contact

/** A number for a link: digits, and the « + » of an international one. */
const telHref = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, "")}`;

/** The international number WhatsApp's link wants, without « + »: « 06 12
 * 34 56 78 » is a French number (the team's), « +44… » or « 0044… » kept
 * as written. Null: no digit. */
export function whatsappNumber(phone: string): string | null {
  const international = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (international) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10)
    return `33${digits.slice(1)}`;
  return digits;
}

const ICON_LINK = cn(
  buttonVariants({ variant: "ghost", size: "icon-sm" }),
  "relative z-10",
);

/** An icon button of the contact's row, its name in a quick tooltip and
 * for screen readers (docs/DESIGN.md « Rangée de boutons »). */
function IconAction({
  label,
  href,
  newTab = false,
  onClick,
  children,
}: {
  label: string;
  // A link (a number to call, WhatsApp in a new tab), else a button.
  href?: string;
  newTab?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          href ? (
            <a
              href={href}
              aria-label={label}
              className={ICON_LINK}
              {...(newTab
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            />
          ) : (
            <button
              type="button"
              aria-label={label}
              className={ICON_LINK}
              onClick={onClick}
            />
          )
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Who to call for the artist (the Excel's « Contact »): name, number, and
 * « Appeler » / « WhatsApp »; a private contact's coordinates the reader
 * may not read stay « Coordonnées privées ». For whoever writes the title
 * (another contact of the Réseau, a new one) or the Réseau (the number):
 * « Contact du manager » in a modal; none yet: « Ajouter le contact ».
 */
export function ContactFacts({
  projectId,
  participationId,
  artist,
  contact,
  canManage,
  canEditNetwork,
  inline = false,
}: {
  projectId: string;
  participationId: string;
  artist: string;
  contact: RecapContact | null;
  canManage: boolean;
  canEditNetwork: boolean;
  inline?: boolean;
}) {
  const t = fr.projectTitles.recap.contact;
  const [open, setOpen] = useState(false);
  const modes = contactModes({ contact, canManage, canEditNetwork });
  const dialog = modes.length > 0 && (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={t.title}
      closeLabel={fr.dialogs.close}
    >
      <ContactForm
        projectId={projectId}
        participationId={participationId}
        contact={contact}
        modes={modes}
        onDone={() => setOpen(false)}
      />
    </FormDialog>
  );

  if (!contact)
    return modes.length > 0 ? (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative z-10"
          aria-label={`${t.add} · ${artist}`}
          onClick={() => setOpen(true)}
        >
          {t.add}
        </Button>
        {dialog}
      </>
    ) : (
      <span className={muted}>{EMPTY_CELL}</span>
    );

  const whatsapp = contact.phone ? whatsappNumber(contact.phone) : null;
  return (
    <span className={factsClass(inline)}>
      <span className="max-w-full break-words" title={contact.name}>
        {contact.name}
      </span>
      {contact.hidden ? (
        <span className={caption}>{t.hidden}</span>
      ) : (
        contact.phone && (
          <span className="whitespace-nowrap text-[color:var(--text-secondary)] tabular-nums">
            {contact.phone}
          </span>
        )
      )}
      {(contact.phone || modes.length > 0) && (
        <span className="-my-1 flex items-center gap-0.5">
          {contact.phone && (
            <IconAction
              label={t.call(contact.name)}
              href={telHref(contact.phone)}
            >
              <IconPhone aria-hidden className="size-4" />
            </IconAction>
          )}
          {whatsapp && (
            <IconAction
              label={t.whatsapp(contact.name)}
              href={`https://wa.me/${whatsapp}`}
              newTab
            >
              <IconMsgs aria-hidden className="size-4" />
            </IconAction>
          )}
          {modes.length > 0 && (
            <IconAction label={t.edit(artist)} onClick={() => setOpen(true)}>
              <IconPenWriting2 aria-hidden className="size-4" />
            </IconAction>
          )}
        </span>
      )}
      {dialog}
    </span>
  );
}

type ContactMode = "phone" | "pick" | "create";

/** What the reader may do of the contact: change its number in the Réseau
 * (manage_network, a contact of the Réseau), take another contact of the
 * Réseau (who writes the title), or add a new one (both). */
function contactModes(input: {
  contact: RecapContact | null;
  canManage: boolean;
  canEditNetwork: boolean;
}): ContactMode[] {
  return [
    ...(input.contact?.contactId &&
    !input.contact.hidden &&
    input.canEditNetwork
      ? (["phone"] as const)
      : []),
    ...(input.canManage ? (["pick"] as const) : []),
    ...(input.canManage && input.canEditNetwork ? (["create"] as const) : []),
  ];
}

/** « Contact du manager »: one gesture at a time, chosen in segments when
 * there are several (the number first, once there is a contact). */
function ContactForm({
  projectId,
  participationId,
  contact,
  modes,
  onDone,
}: {
  projectId: string;
  participationId: string;
  contact: RecapContact | null;
  modes: ContactMode[];
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap.contact;
  const [mode, setMode] = useState<ContactMode>(modes[0]);
  return (
    <div className="flex flex-col gap-4">
      {modes.length > 1 && (
        <SegmentedControl<ContactMode>
          aria-label={t.modesLabel}
          options={modes.map((value) => ({ value, label: t.modes[value] }))}
          value={mode}
          onChange={(next) => next && setMode(next)}
          fill
        />
      )}
      {mode === "phone" && contact?.contactId ? (
        <PhoneForm
          projectId={projectId}
          contactId={contact.contactId}
          name={contact.name}
          phone={contact.phone}
          onDone={onDone}
        />
      ) : mode === "pick" ? (
        <PickForm
          projectId={projectId}
          participationId={participationId}
          current={contact?.contactId ?? null}
          onDone={onDone}
        />
      ) : (
        <CreateForm
          projectId={projectId}
          participationId={participationId}
          onDone={onDone}
        />
      )}
    </div>
  );
}

/** The contact's number, changed in the Réseau (« Numéro changé dans le
 * Réseau »); blank removes it. */
function PhoneForm({
  projectId,
  contactId,
  name,
  phone,
  onDone,
}: {
  projectId: string;
  contactId: string;
  name: string;
  phone: string | null;
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap;
  const { pending, error, run } = useWriteSubmit(onDone, t.phoneChanged);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(
          new FormData(event.currentTarget).get("contactPhone") ?? "",
        );
        run(() => setContactPhone({ projectId, contactId, phone: value }));
      }}
    >
      <Field
        name="contactPhone"
        label={t.contact.phone(name)}
        type="tel"
        autoComplete="off"
        defaultValue={phone ?? ""}
        maxLength={40}
        autoFocus
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.contact.phoneSubmit}
        onCancel={onDone}
      />
    </form>
  );
}

/** Another contact of the Réseau as the artist's interlocutor (the
 * Réseau's picker: search, or add one to the Réseau without leaving). */
function PickForm({
  projectId,
  participationId,
  current,
  onDone,
}: {
  projectId: string;
  participationId: string;
  current: string | null;
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap.contact;
  const { pending, error, run } = useWriteSubmit(onDone, t.picked);
  const [missing, setMissing] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    // A contact added from the picker submits its own form (in a modal).
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const contactId = String(
      new FormData(event.currentTarget).get("contactId") ?? "",
    );
    setMissing(!contactId);
    if (contactId)
      run(() =>
        setParticipationContact({ projectId, participationId, contactId }),
      );
  }
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
      <PersonPickerField
        refName="contactId"
        nameName="contactName"
        legend={t.pick}
        load={() => listNetworkPeople()}
        defaultRef={current}
        defaultName={null}
        createRoles={["manager"]}
        refOfContact={(id) => id}
        allowNameOnly={false}
        required
        error={missing ? t.pickRequired : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.pickSubmit}
        onCancel={onDone}
      />
    </form>
  );
}

/** A new contact of the Réseau (a manager: name and number), made the
 * artist's interlocutor. The name is asked again in red when left empty. */
function CreateForm({
  projectId,
  participationId,
  onDone,
}: {
  projectId: string;
  participationId: string;
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap;
  const { pending, error, run } = useWriteSubmit(onDone, t.contact.created);
  const [missing, setMissing] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(data.get("contactName") ?? "").trim();
        const phone = String(data.get("contactPhone") ?? "");
        setMissing(!name);
        if (!name)
          return void document.getElementById("recap-contact-name")?.focus();
        run(() =>
          createParticipationContact({
            projectId,
            participationId,
            name,
            phone,
          }),
        );
      }}
    >
      <Field
        id="recap-contact-name"
        name="contactName"
        label={t.contact.name}
        required
        autoComplete="off"
        maxLength={200}
        autoFocus
        error={missing ? t.errors.nameRequired : undefined}
        onChange={() => setMissing(false)}
      />
      <Field
        name="contactPhone"
        label={t.contact.newPhone}
        type="tel"
        autoComplete="off"
        maxLength={40}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.contact.createSubmit}
        onCancel={onDone}
      />
    </form>
  );
}

// ------------------------------------------------------------ Caler le call

/** « Caler le call » of a row (Ibé 18/11, 1:00:28): the artist agreed and
 * no call is planned. The shared data (negotiators' slots, contacts) is
 * given once to the board, the row's target computed here. */
export function PlanCallButton({
  shared,
  accord,
}: {
  shared: SharedNegotiationCall | null;
  accord: RecapAccord;
}) {
  if (!shared || !accord.call || !accord.showPlanCall) return null;
  const data = negotiationCallData(shared, accord.call);
  if (!data) return null;
  return (
    <span className="relative z-10">
      <NegotiationCallButton data={data} variant="outline" size="sm" />
    </span>
  );
}

/** Whether a row shows « Caler le call » (so that its cell does not say
 * « — » in its place). */
export const plansCall = (
  shared: SharedNegotiationCall | null,
  accord: RecapAccord,
) =>
  Boolean(
    shared &&
    accord.call &&
    accord.showPlanCall &&
    negotiationCallData(shared, accord.call),
  );
