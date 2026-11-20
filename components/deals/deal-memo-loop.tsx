"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { OptionSelect } from "@/components/projects/option-select";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { LoopEntry } from "@/lib/deals/memo-mail-queries";
import { addDealLoop, removeDealLoop } from "@/lib/deals/memo-mail-actions";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { listNetworkPeople } from "@/lib/network/people-actions";

const fr = { dealMemos };
const t = fr.dealMemos.loop;

type Kind = LoopEntry["kind"];

function AddForm({
  dealId,
  members,
  linked,
  onDone,
}: {
  dealId: string;
  members: Record<string, string>;
  // The deal's people and counterpart: listed first.
  linked: string[];
  onDone: () => void;
}) {
  const [kind, setKind] = useState<Kind>("contact");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.added);
  function submit(event: FormEvent<HTMLFormElement>) {
    // A contact added from the picker submits its own form (in a modal).
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = String(
      data.get(kind === "contact" ? "contactId" : "personId") ?? "",
    );
    setMissing(!id);
    if (id)
      run(() =>
        addDealLoop(
          dealId,
          kind === "contact" ? { contactId: id } : { personId: id },
        ),
      );
  }
  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <SegmentedControl<Kind>
        aria-label={t.kind}
        options={[
          { value: "contact", label: t.kinds.contact },
          { value: "member", label: t.kinds.member },
        ]}
        value={kind}
        onChange={(value) => {
          if (value) setKind(value);
          setMissing(false);
        }}
      />
      {kind === "contact" ? (
        <PersonPickerField
          refName="contactId"
          nameName="contactName"
          legend={t.contact}
          load={() => listNetworkPeople()}
          defaultRef={null}
          defaultName={null}
          createRoles={[]}
          refOfContact={(id) => id}
          allowNameOnly={false}
          suggest={
            linked.length ? (option) => linked.includes(option.id) : undefined
          }
          required
          error={missing ? t.required : undefined}
        />
      ) : Object.keys(members).length > 0 ? (
        <OptionSelect
          id={`deal-${dealId}-loop-member`}
          name="personId"
          label={t.member}
          placeholder={t.memberPlaceholder}
          required
          items={members}
          error={missing ? t.required : undefined}
        />
      ) : (
        <EmptyNote>{t.noMember}</EmptyNote>
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

function RemoveButton({ dealId, id }: { dealId: string; id: string }) {
  const { pending, run } = useWriteSubmit(undefined, t.removed);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => run(() => removeDealLoop(dealId, id))}
    >
      {t.remove}
    </Button>
  );
}

/**
 * The people in the loop of a deal's memo (réunion avec Ibé du 18/11/2026:
 * « mettre dans la boucle des personnes, par exemple le DG du label »): a
 * contact of the Réseau receives in copy the memo sent back (its address
 * when the reader may read it), a member who reads the deal is told of each
 * step. Whoever writes the deal adds one (`PersonPickerField`, the deal's
 * people first; a member among those who read the deal) or takes one off.
 */
export function DealMemoLoop({
  dealId,
  entries,
  members,
  linked,
  canWrite,
}: {
  dealId: string;
  entries: LoopEntry[];
  // For whoever writes the deal: the members who may be put in it.
  members: Record<string, string>;
  linked: string[];
  canWrite: boolean;
}) {
  const addButton = canWrite && (
    <DialogButton label={t.add} title={t.title} description={t.description}>
      {(close) => (
        <AddForm
          dealId={dealId}
          members={members}
          linked={linked}
          onDone={close}
        />
      )}
    </DialogButton>
  );
  if (entries.length === 0)
    return <EmptyNote action={addButton}>{t.empty}</EmptyNote>;
  return (
    <div className="flex flex-col gap-3">
      <FactRows>
        {entries.map((entry) => (
          <FactRow
            key={entry.id}
            label={t.kinds[entry.kind]}
            value={entry.name}
            source={
              entry.kind === "member"
                ? t.told
                : entry.email
                  ? t.copyTo(entry.email)
                  : t.noEmail
            }
            side={canWrite && <RemoveButton dealId={dealId} id={entry.id} />}
          />
        ))}
      </FactRows>
      {addButton && <div>{addButton}</div>}
    </div>
  );
}
