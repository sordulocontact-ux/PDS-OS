"use client";

import { useState, type ReactNode } from "react";

import { ReferenceAddForm } from "@/components/design/refs/reference-add-form";
import type { TargetOption } from "@/components/design/references/target-picker";
import { Button } from "@/components/ui/button";
import { VersionCard } from "@/components/ui/version-card";
import { designSteps } from "@/lib/i18n/fr/design-steps";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { designSteps };

const t = fr.designSteps.references;

/**
 * One group of the Références step (proto deR): the direction, a
 * deliverable, or « À rattacher »; its count; « Ajouter une référence » on
 * the right opening the form in place, its group checked.
 */
export function ReferenceGroup({
  id,
  title,
  status,
  add,
  empty,
  children,
}: {
  id: string;
  title: string;
  status: { tone: Tone; label: string };
  add: {
    organizationId: string;
    projectId: string;
    options: TargetOption[];
    target: string;
  } | null;
  empty: string | null;
  children: ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <VersionCard id={id} title={title} status={status} defaultOpen>
      <div className="flex flex-col gap-3">
        {add &&
          (adding ? (
            <ReferenceAddForm
              organizationId={add.organizationId}
              projectId={add.projectId}
              options={add.options}
              initialTargets={[add.target]}
              onClose={() => setAdding(false)}
            />
          ) : (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdding(true)}
              >
                {t.add}
              </Button>
            </div>
          ))}
        {empty ? (
          <p className="text-body-sm text-[color:var(--text-secondary)]">
            {empty}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[1200px]:grid-cols-3 sm:grid-cols-2">
            {children}
          </div>
        )}
      </div>
    </VersionCard>
  );
}
