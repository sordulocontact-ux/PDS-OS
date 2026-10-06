"use client";

import { useState } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { qualifyClearance } from "@/lib/legal/clearance/actions";
import { SCOPES, isClosed, type Scope } from "@/lib/legal/clearance/matrix";
import type { Clearance } from "@/lib/legal/clearance/types";

import { useLegalAction } from "@/components/legal/use-legal-action";

const NONE = "none-person";

/** « Qualifier l'usage » (the first step of the ticket): what is taken,
 * which rights it touches, or why nothing is to secure; who follows it. */
export function QualifyForm({
  projectId,
  clearance,
  people,
}: {
  projectId: string;
  clearance: Clearance;
  people: Array<{ personId: string; name: string }>;
}) {
  const t = fr.legalClearance.drawer;
  const [usage, setUsage] = useState(clearance.usage ?? "");
  const [scope, setScope] = useState<Scope>(clearance.scope ?? "work");
  const [reason, setReason] = useState(clearance.reason ?? "");
  const [responsible, setResponsible] = useState(clearance.responsibleId);
  const { pending, run } = useLegalAction();
  const closed = isClosed(clearance.status);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-medium">{t.qualification}</h3>
      <TextareaField
        name={`usage-${clearance.id}`}
        label={t.usage}
        rows={2}
        maxLength={2000}
        value={usage}
        disabled={closed}
        onChange={(event) => setUsage(event.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <OptionSelect
          name={`scope-${clearance.id}`}
          label={t.scope}
          items={Object.fromEntries(
            SCOPES.map((s) => [s, fr.legalClearance.scopes[s]]),
          )}
          defaultValue={clearance.scope ?? "work"}
          onValueChange={(value) => setScope(value as Scope)}
        />
        <OptionSelect
          name={`responsible-${clearance.id}`}
          label={t.responsible}
          items={{
            [NONE]: t.noResponsible,
            ...Object.fromEntries(people.map((p) => [p.personId, p.name])),
          }}
          defaultValue={clearance.responsibleId ?? NONE}
          onValueChange={(value) =>
            setResponsible(value === NONE ? null : value)
          }
        />
      </div>
      {scope === "none" && (
        <TextareaField
          name={`reason-${clearance.id}`}
          label={t.reason}
          rows={2}
          maxLength={2000}
          value={reason}
          disabled={closed}
          onChange={(event) => setReason(event.target.value)}
        />
      )}
      {!closed && (
        <Button
          size="sm"
          variant="outline"
          className="self-end"
          disabled={pending}
          onClick={() =>
            run(() =>
              qualifyClearance({
                projectId,
                clearanceId: clearance.id,
                usage,
                scope,
                reason: scope === "none" ? reason : "",
                responsibleId: responsible,
              }),
            )
          }
        >
          {pending ? t.saving : t.save}
        </Button>
      )}
    </section>
  );
}
