"use client";

import { useState, type ReactNode } from "react";

import { DesignBlock } from "@/components/design/design-block";
import {
  AddDeliverableForm,
  type AddDeliverableDefaults,
} from "@/components/design/home/add-deliverable-form";
import { Button } from "@/components/ui/button";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { designSteps };

const t = fr.designSteps.home;

/** « Livrables reçus (n) » with « Ajouter un livrable » opening its form in
 * place, above the rows (`children`). */
export function ReceivedHead({
  projectId,
  count,
  canAdd,
  calls,
  levers,
  initial,
  children,
}: {
  projectId: string;
  count: number;
  canAdd: boolean;
  calls: Array<{ id: string; title: string }>;
  levers: Array<{ id: string; label: string }>;
  initial?: AddDeliverableDefaults;
  children: ReactNode;
}) {
  const [adding, setAdding] = useState(Boolean(initial));
  return (
    <DesignBlock
      title={t.received(count)}
      action={
        canAdd &&
        !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            {t.add}
          </Button>
        )
      }
    >
      {adding && (
        <AddDeliverableForm
          projectId={projectId}
          calls={calls}
          levers={levers}
          initial={initial}
          onClose={() => setAdding(false)}
        />
      )}
      {children}
    </DesignBlock>
  );
}
