"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  addProjectCreative,
  removeProjectCreative,
} from "@/lib/projects/creative-actions";
import type { CreativeMember } from "@/lib/projects/creatives";

// Creative directors attached to a project: they see it (and all it holds)
// without writing. The director and the project's owner manage the list.
export function CreativeTeam({
  projectId,
  members,
  candidates,
  canManage,
}: {
  projectId: string;
  members: CreativeMember[];
  candidates: CreativeMember[];
  canManage: boolean;
}) {
  const t = fr.shell.project.creatives;
  const [selected, setSelected] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const attached = new Set(members.map((m) => m.personId));
  const available = candidates.filter((c) => !attached.has(c.personId));

  function run(action: () => Promise<boolean>, after?: () => void) {
    setFailed(false);
    startTransition(async () => {
      const ok = await action();
      if (!ok) setFailed(true);
      else after?.();
    });
  }

  return (
    <section aria-labelledby="creatives-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="creatives-title" className="text-base font-medium">
          {t.title}
        </h2>
        <p className="text-xs text-muted-foreground">{t.hint}</p>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {members.map((member) => (
            <li
              key={member.personId}
              className="flex min-h-12 items-center justify-between gap-2 px-4 py-2 text-sm"
            >
              <span className="font-medium">{member.name}</span>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => removeProjectCreative(projectId, member.personId))
                  }
                  aria-label={t.remove(member.name)}
                >
                  {t.removeShort}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage &&
        (candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.noCreative}</p>
        ) : available.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.noneAvailable}</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <OptionSelect
                key={members.length}
                name="creative"
                label={t.label}
                placeholder={t.placeholder}
                items={Object.fromEntries(
                  available.map((c) => [c.personId, c.name]),
                )}
                onValueChange={setSelected}
              />
            </div>
            <Button
              size="lg"
              variant="outline"
              disabled={pending || !selected}
              onClick={() =>
                selected &&
                run(
                  () => addProjectCreative(projectId, selected),
                  () => setSelected(null),
                )
              }
            >
              {pending ? t.adding : t.add}
            </Button>
          </div>
        ))}

      {failed && <FormMessage kind="error">{t.error}</FormMessage>}
    </section>
  );
}
