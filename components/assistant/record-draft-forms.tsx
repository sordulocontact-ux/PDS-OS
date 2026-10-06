"use client";

import { BudgetLineForm } from "@/components/budget/budget-line-form";
import { MeetingForm } from "@/components/calls/new-meeting-button";
import { ContractForm } from "@/components/contracts/contract-form";
import { TemplateForm } from "@/components/contracts/templates/template-form";
import { Loading, type SavedLink } from "@/components/assistant/draft-forms";
import { ContactForm } from "@/components/network/contact-form";
import { TaskForm } from "@/components/project-work/add-task-form";
import {
  loadBudgetLevers,
  loadMeetingForm,
  loadTaskMembers,
  loadTemplateCurrent,
  type TemplateCurrent,
} from "@/lib/assistant/draft-record-actions";
import type {
  BudgetLineDraft,
  ContractDraft,
  ContractTemplateDraft,
  MeetingDraft,
  NetworkContactDraft,
  TaskDraft,
} from "@/lib/assistant/draft-records";
import { routes } from "@/lib/auth/redirects";
import { loadContractOptions } from "@/lib/contracts/actions";
import { fr } from "@/lib/i18n/fr";
import { loadContactOptions } from "@/lib/network/actions";

// The real forms of PO's record drafts (lib/assistant/draft-records.ts),
// pre-filled; the person saves with their own session. Each form stays on
// the page once saved (`stay`) so the card can show the link.

type FormProps<D> = {
  draft: D;
  onSaved: (saved: SavedLink) => void;
  onCancel: () => void;
};

export function ContractTemplateDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<ContractTemplateDraft>) {
  const { seriesId, values } = draft;
  const form = (current: TemplateCurrent | null) => (
    <TemplateForm
      initial={{
        seriesId,
        name: values.name ?? current?.name ?? "",
        type: values.type ?? current?.type ?? "other",
        roles: values.roles ?? current?.roles ?? [],
        usage: values.usage ?? current?.usage ?? "",
        body: values.body ?? current?.body ?? "",
      }}
      onCancel={onCancel}
      onDone={() =>
        onSaved({
          label: fr.assistantRecords.templatesLink,
          href: routes.contractTemplates,
        })
      }
    />
  );
  // A new version starts from the latest one, read when the panel opens.
  return seriesId ? (
    <Loading load={() => loadTemplateCurrent(seriesId)}>{form}</Loading>
  ) : (
    form(null)
  );
}

export function ContractDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<ContractDraft>) {
  const { contractId, values } = draft;
  return (
    <Loading load={loadContractOptions}>
      {(options) => (
        <ContractForm
          options={options}
          contract={
            contractId
              ? {
                  ...values,
                  id: contractId,
                  ownerPersonId: values.ownerPersonId ?? "",
                }
              : undefined
          }
          initial={
            contractId
              ? undefined
              : { ...values, ownerPersonId: values.ownerPersonId ?? undefined }
          }
          stay
          onCancel={onCancel}
          onSaved={(id) =>
            onSaved({ label: values.title, href: routes.contract(id) })
          }
        />
      )}
    </Loading>
  );
}

export function NetworkContactDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<NetworkContactDraft>) {
  const { contactId, values } = draft;
  return (
    <Loading load={loadContactOptions}>
      {(options) => (
        <ContactForm
          options={options}
          contact={contactId ? { ...values, id: contactId } : undefined}
          initial={contactId ? undefined : values}
          stay
          onCancel={onCancel}
          onSaved={(id) =>
            onSaved({ label: values.name, href: routes.networkContact(id) })
          }
        />
      )}
    </Loading>
  );
}

export function TaskDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<TaskDraft>) {
  return (
    <Loading load={loadTaskMembers}>
      {(members) => (
        <TaskForm
          projectId={draft.projectId}
          members={members}
          initial={draft.values}
          onCancel={onCancel}
          onDone={() =>
            onSaved({
              label: draft.projectTitle,
              href: routes.projectWork(draft.projectId),
            })
          }
        />
      )}
    </Loading>
  );
}

export function MeetingDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<MeetingDraft>) {
  const { occurredAtLocal, ...defaults } = draft.values;
  return (
    <Loading load={loadMeetingForm}>
      {({ members, defaultOccurredAt }) => (
        <MeetingForm
          members={members}
          defaultOccurredAt={occurredAtLocal || defaultOccurredAt}
          defaults={defaults}
          onCancel={onCancel}
          onSaved={(id) =>
            onSaved({ label: defaults.title, href: routes.meeting(id) })
          }
        />
      )}
    </Loading>
  );
}

export function BudgetLineDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<BudgetLineDraft>) {
  return (
    <Loading load={() => loadBudgetLevers(draft.projectId)}>
      {(levers) => (
        <BudgetLineForm
          projectId={draft.projectId}
          line={null}
          initial={draft.values}
          levers={levers}
          onCancel={onCancel}
          onDone={() =>
            onSaved({
              label: draft.projectTitle,
              href: routes.projectBudget(draft.projectId),
            })
          }
        />
      )}
    </Loading>
  );
}
