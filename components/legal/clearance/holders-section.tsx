"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  addRightsholder,
  removeRightsholder,
} from "@/lib/legal/clearance/actions";
import {
  HOLDER_ROLES,
  isClosed,
  rightsOf,
  type HolderRole,
  type RightKind,
} from "@/lib/legal/clearance/matrix";
import type { Clearance } from "@/lib/legal/clearance/types";

import { useLegalAction } from "@/components/legal/use-legal-action";

/** The rights holders of each concerned right (« Contact trouvé ne signifie
 * pas autorisation »: they are who to ask, not an answer). */
export function HoldersSection({
  projectId,
  clearance,
}: {
  projectId: string;
  clearance: Clearance;
}) {
  const t = fr.legalClearance.drawer;
  const rights = rightsOf(clearance.scope);
  const [name, setName] = useState("");
  const [right, setRight] = useState<RightKind>(rights[0] ?? "work");
  const [role, setRole] = useState<HolderRole>("publisher");
  const { pending, run } = useLegalAction();
  if (rights.length === 0) return null;
  const closed = isClosed(clearance.status);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-medium">{t.rightsholders}</h3>
      {clearance.holders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.rightsholdersEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {clearance.holders.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0 break-words">
                {h.name}
                <span className="block text-sm text-muted-foreground">
                  {
                    fr.legalClearance.roles[
                      h.role as keyof typeof fr.legalClearance.roles
                    ]
                  }{" "}
                  · {fr.legalClearance.rights[h.right]}
                </span>
              </span>
              {!closed && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.remove(h.name)}
                  disabled={pending}
                  onClick={() => run(() => removeRightsholder(projectId, h.id))}
                >
                  <IconXmark aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!closed && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_auto] sm:items-end">
          <Field
            name={`holder-${clearance.id}`}
            label={t.name}
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <OptionSelect
            name={`holder-right-${clearance.id}`}
            label={t.right}
            items={Object.fromEntries(
              rights.map((r) => [r, fr.legalClearance.rights[r]]),
            )}
            defaultValue={rights[0]}
            onValueChange={(v) => setRight(v as RightKind)}
          />
          <OptionSelect
            name={`holder-role-${clearance.id}`}
            label={t.role}
            items={Object.fromEntries(
              HOLDER_ROLES.map((r) => [r, fr.legalClearance.roles[r]]),
            )}
            defaultValue="publisher"
            onValueChange={(v) => setRole(v as HolderRole)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !name.trim()}
            onClick={() =>
              run(
                () =>
                  addRightsholder({
                    projectId,
                    clearanceId: clearance.id,
                    right,
                    name,
                    role,
                  }),
                () => setName(""),
              )
            }
          >
            {t.add}
          </Button>
        </div>
      )}
    </section>
  );
}
