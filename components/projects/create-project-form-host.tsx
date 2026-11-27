"use client";

import { useState } from "react";

import { CreateProjectForm } from "@/components/projects/create-project-form";
import { isDraftCreatedHere } from "@/components/projects/use-project-draft";

type FormProps = React.ComponentProps<typeof CreateProjectForm>;

/**
 * The creation page's form, mounted again only for another draft or
 * selection. A draft this very form saved names itself in the address, and
 * the page rendered again (a title created from the form revalidates it)
 * then hands its saved state: keeping the form shown keeps what was typed
 * since, the new title included. Fresh lists (`masters`…) still flow in.
 */
export function CreateProjectFormHost({
  formKey,
  ...props
}: FormProps & { formKey: string }) {
  const [shown, setShown] = useState({
    key: formKey,
    defaults: props.defaults,
    draftId: props.draftId ?? null,
  });
  const ownDraft = props.draftId ? isDraftCreatedHere(props.draftId) : false;
  if (formKey !== shown.key && !ownDraft)
    setShown({
      key: formKey,
      defaults: props.defaults,
      draftId: props.draftId ?? null,
    });

  return (
    <CreateProjectForm
      key={shown.key}
      {...props}
      defaults={shown.defaults}
      draftId={shown.draftId}
    />
  );
}
