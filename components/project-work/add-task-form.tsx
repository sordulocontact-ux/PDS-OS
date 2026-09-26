"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTask } from "@/lib/framing/actions/points-tasks";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

const t = fr.projectWork.work.add;

/**
 * A free task on the project's to-do list (owner only): title, owner and due
 * date are all required, chosen by a person — never by PO.
 */
export function AddTaskForm({
  projectId,
  members,
  defaultAssignee,
}: {
  projectId: string;
  members: Member[];
  defaultAssignee: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(
    defaultAssignee ?? members[0]?.personId ?? "",
  );
  const [due, setDue] = useState("");
  const { pending, run } = useFramingAction();
  const people = Object.fromEntries(members.map((m) => [m.personId, m.name]));

  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        {t.open}
      </Button>
    );

  return (
    <form
      aria-label={t.title}
      className="grid w-full gap-3 rounded-2xl border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            createTask(projectId, {
              title,
              assigneePersonId: assignee,
              dueDate: due,
              sourceReportItemId: null,
            }),
          () => {
            setTitle("");
            setDue("");
            setOpen(false);
          },
        );
      }}
    >
      <div className="grid gap-0.5">
        <p className="text-sm font-medium">{t.title}</p>
        <p className="text-xs text-muted-foreground">{t.hint}</p>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="new-task-title">{t.label}</Label>
        <Input
          id="new-task-title"
          value={title}
          maxLength={300}
          placeholder={t.placeholder}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor="new-task-assignee">{t.assignee}</Label>
          <OptionSelect
            id="new-task-assignee"
            label={t.assignee}
            options={people}
            value={assignee}
            onChange={setAssignee}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="new-task-due">{t.dueDate}</Label>
          <Input
            id="new-task-due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={pending || !title.trim() || !assignee || !due}
          >
            {t.submit}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            {t.cancel}
          </Button>
        </div>
      </div>
    </form>
  );
}
