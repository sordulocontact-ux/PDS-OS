"use client";

import { IconMsgs, IconPenWriting2, IconPhone } from "nucleo-sharp-essential";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { NegotiationCallButton } from "@/components/deals/negotiation-call-button";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { caption, factsClass } from "@/components/projects/titles/recap-facts";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  listNetworkPeople,
  type NetworkPersonOption,
} from "@/lib/network/people-actions";
import {
  createParticipationContact,
  setContactPhone,
  setParticipationContact,
  setParticipationNote,
} from "@/lib/projects/participation-actions";
import {
  CONTACT_KINDS,
  contactLabelOf,
  type ContactKind,
  type RecapAccord,
  type RecapContact,
} from "@/lib/projects/recap-rules";
import { cn } from "@/lib/utils";

// What the collective's recap edits in place (retours d'Ibé du 18/11/2026,
// lot 2: « contact, sortie oui / non, notes », nothing that has a module):
// the release of a title, the note and the manager's contact of an artist,
// and « Caler le call » (Sacha's NegotiationCallButton). `relative z-10`:
// above a row's DataTableLink, where one covers the row.

const fr = { dialogs, projectTitles };

const LINE_BUTTON =
  "relative z-10 max-w-full rounded-sm text-left outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

// ----------------------------------------------------------------- Release

export type ReleaseValue = "yes" | "no" | "undecided";

export const releaseValueOf = (decision: boolean | null): ReleaseValue =>
  decision === true ? "yes" : decision === false ? "no" : "undecided";

/** « Sortie » of a title: Oui / Non / Pas décidé, saved at the choice
 * (setTitleRelease, by the board); read only, its word. A 32 px menu, the
 * height of a row's menu (docs/DESIGN.md « Hauteur d'un champ »): three
 * segments did not fit beside their label in the title's column. */
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
  const items: Record<ReleaseValue, string> = {
    yes: t.yes,
    no: t.no,
    undecided: t.undecided,
  };
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (isReleaseValue(next) && next !== value && !pending) onPick(next);
      }}
    >
      <SelectTrigger aria-label={t.label(label)} className="max-w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([option, optionLabel]) => (
          <SelectItem key={option} value={option}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const isReleaseValue = (value: unknown): value is ReleaseValue =>
  value === "yes" || value === "no" || value === "undecided";

// -------------------------------------------------------------------- Note

/** The artist's note, on one line (the whole note on hover; `wrap`, in a
 * « Note » column: up to three lines); clicked, it opens to be changed.
 * Empty: « Ajouter une note » for whoever writes the title, nothing for the
 * others. */
export function NoteLine({
  projectId,
  participationId,
  artist,
  note,
  canEdit,
  wrap = false,
}: {
  projectId: string;
  participationId: string;
  artist: string;
  note: string | null;
  canEdit: boolean;
  wrap?: boolean;
}) {
  const t = fr.projectTitles.recap.note;
  const [open, setOpen] = useState(false);
  // One line, or three in a column of its own.
  const lines = wrap
    ? "line-clamp-3 whitespace-normal break-words"
    : "truncate";
  if (!canEdit)
    return note ? (
      <span
        className={cn(caption, lines, "text-[color:var(--text-secondary)]")}
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
          lines,
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
 * Who to call for the artist (the Excel's « Contact »), under the artist's
 * name: its role (« Manager », « Producteur », else « Contact »), name, number, and « Appeler » / « WhatsApp »; a
 * private contact's coordinates the reader may not read stay « Coordonnées
 * privées ». For whoever writes the title (another contact of the Réseau, a
 * new one) or the Réseau (the number): « Contact de l'artiste » in a modal;
 * none yet: « Ajouter le contact ». None and nothing to do: nothing.
 */
export function ContactFacts({
  projectId,
  participationId,
  artist,
  contact,
  canManage,
  canEditNetwork,
}: {
  projectId: string;
  participationId: string;
  artist: string;
  contact: RecapContact | null;
  canManage: boolean;
  canEditNetwork: boolean;
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
          className="relative z-10 self-start"
          aria-label={`${t.add} · ${artist}`}
          onClick={() => setOpen(true)}
        >
          {t.add}
        </Button>
        {dialog}
      </>
    ) : null;

  const whatsapp = contact.phone ? whatsappNumber(contact.phone) : null;
  return (
    <span className={factsClass(true)}>
      <span className={caption}>{contact.role ?? t.label}</span>
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

/** « Contact de l'artiste »: one gesture at a time, chosen in segments when
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
          currentKind={contact?.kind ?? "manager"}
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

/** What the contact is for the artist: Manager, Producteur, Autre (the
 * participation's label, see CONTACT_KINDS). */
function KindChoice({
  value,
  onChange,
}: {
  value: ContactKind;
  onChange: (kind: ContactKind) => void;
}) {
  const t = fr.projectTitles.recap.contact;
  return (
    <ChipChoice<ContactKind>
      name="contactKind"
      legend={t.role}
      options={CONTACT_KINDS.map((kind) => ({
        value: kind,
        label: t.kinds[kind],
      }))}
      value={value}
      onChange={(next) => next && onChange(next)}
      fill
    />
  );
}

/** Another contact of the Réseau as the artist's interlocutor (the
 * Réseau's picker: search, or add one to the Réseau without leaving), and
 * what it is for the artist: the current one's kind, a manager of the
 * Réseau once picked. */
function PickForm({
  projectId,
  participationId,
  current,
  currentKind,
  onDone,
}: {
  projectId: string;
  participationId: string;
  current: string | null;
  currentKind: ContactKind;
  onDone: () => void;
}) {
  const t = fr.projectTitles.recap.contact;
  const { pending, error, run } = useWriteSubmit(onDone, t.picked);
  const [missing, setMissing] = useState(false);
  const [kind, setKind] = useState<ContactKind>(currentKind);
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
        setParticipationContact({
          projectId,
          participationId,
          contactId,
          label: contactLabelOf(kind),
        }),
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
        onPick={(option: NetworkPersonOption | null) =>
          option &&
          setKind(option.roles.includes("manager") ? "manager" : "other")
        }
        allowNameOnly={false}
        required
        error={missing ? t.pickRequired : undefined}
      />
      <KindChoice value={kind} onChange={setKind} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.pickSubmit}
        onCancel={onDone}
      />
    </form>
  );
}

/** A new contact of the Réseau (name, number, and what it is for the artist:
 * a manager, a producer or another), made the artist's interlocutor. The
 * name is asked again in red when left empty. */
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
  const [kind, setKind] = useState<ContactKind>("manager");
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
            kind,
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
      <KindChoice value={kind} onChange={setKind} />
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
