"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { framing } from "@/lib/i18n/fr/framing";

const fr = { framing };

export type ActionTaskValues = {
  assigneePersonId: string;
  dueDate: string;
  projectId: string;
};

/**
 * An action noted in a call becomes a task only once a person picks its
 * owner and due date — never PO (CLAUDE.md rule 6). `projects`: a call
 * outside any project (internal meeting) asks which project the task goes
 * to; otherwise `projectId` is fixed.
 */
export function ActionTaskForm({
  item,
  members,
  defaultAssigneeId,
  projectId,
  projects,
  pending,
  onSubmit,
}: {
  item: { id: string; what: string; who: string | null };
  members: { personId: string; name: string }[];
  defaultAssigneeId: string;
  projectId?: string;
  projects?: { id: string; title: string }[];
  pending: boolean;
  onSubmit: (values: ActionTaskValues) => void;
}) {
  const t = fr.framing.tasks;
  const [assignee, setAssignee] = useState(defaultAssigneeId);
  const [due, setDue] = useState("");
  const [project, setProject] = useState(projectId ?? projects?.[0]?.id ?? "");
  const people = Object.fromEntries(members.map((m) => [m.personId, m.name]));

  return (
    <form
      className="grid gap-2 rounded-lg border border-dashed border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          assigneePersonId: assignee,
          dueDate: due,
          projectId: project,
        });
      }}
    >
      <p className="text-sm">
        {item.what}
        {item.who && (
          <span className="text-muted-foreground"> — {item.who}</span>
        )}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        {projects && (
          <div className="grid gap-1">
            <Label htmlFor={`pr-${item.id}`} required>
              {t.project}
            </Label>
            <OptionSelect
              id={`pr-${item.id}`}
              required
              label={t.project}
              options={Object.fromEntries(projects.map((p) => [p.id, p.title]))}
              value={project}
              onChange={setProject}
            />
          </div>
        )}
        <div className="grid gap-1">
          <Label htmlFor={`as-${item.id}`} required>
            {t.assignee}
          </Label>
          <OptionSelect
            id={`as-${item.id}`}
            required
            label={t.assignee}
            options={people}
            value={assignee}
            onChange={setAssignee}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`due-${item.id}`} required>
            {t.dueDate}
          </Label>
          <Input
            id={`due-${item.id}`}
            aria-required
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="w-auto"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={pending || !assignee || !due || !project}
        >
          {t.create}
        </Button>
      </div>
    </form>
  );
}
