"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignRole, releaseRole } from "@/lib/framing/actions/team-roles";
import type { FramingData } from "@/lib/framing/queries";
import type { RoleCard } from "@/lib/framing/team-board";
import { TEAM_ROLE_KEYS, type TeamRoleKey } from "@/lib/framing/team-roles";
import { fr } from "@/lib/i18n/fr";

/**
 * Gives a role to someone already in the team (one click) or to a new name.
 * `card` fixes the role; without it, the role is chosen first.
 */
export function AssignRoleDialog({
  projectId,
  card,
  team,
  open,
  onOpenChange,
}: {
  projectId: string;
  card: RoleCard | null;
  team: FramingData["team"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.framingGuide.team;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={card ? t.assignTitle(t.roles[card.role]) : t.assignAny}
      description={card ? t.assignDescription : t.assignAnyDescription}
      closeLabel={fr.framingGuide.close}
    >
      <AssignForm
        projectId={projectId}
        card={card}
        team={team}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

function AssignForm({
  projectId,
  card,
  team,
  onDone,
}: {
  projectId: string;
  card: RoleCard | null;
  team: FramingData["team"];
  onDone: () => void;
}) {
  const t = fr.framingGuide.team;
  const { pending, run } = useFramingAction();
  const [role, setRole] = useState<TeamRoleKey>(
    card?.role ?? TEAM_ROLE_KEYS[0],
  );
  const [name, setName] = useState("");
  const people = team.filter((m) => m.role_key !== role);
  const roleOptions = Object.fromEntries(
    TEAM_ROLE_KEYS.map((key) => [key, t.roles[key]]),
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => assignRole(projectId, role, { name }), onDone);
      }}
    >
      {!card && (
        <div className="grid gap-1.5">
          <Label htmlFor="assign-role">{t.role}</Label>
          <OptionSelect
            id="assign-role"
            label={t.role}
            options={roleOptions}
            value={role}
            onChange={(v) => setRole(v as TeamRoleKey)}
          />
        </div>
      )}
      {people.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {people.map((m) => (
            <FilterChip
              key={m.id}
              pressed={false}
              disabled={pending}
              onClick={() =>
                run(
                  () => assignRole(projectId, role, { memberId: m.id }),
                  onDone,
                )
              }
            >
              {m.display_name}
            </FilterChip>
          ))}
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="assign-name">{t.name}</Label>
        <Input
          id="assign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending || name.trim() === ""}
        >
          {fr.framingGuide.save}
        </Button>
        {card?.member && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={pending}
            onClick={() =>
              card.member &&
              run(() => releaseRole(projectId, card.member!.id), onDone)
            }
          >
            {t.release}
          </Button>
        )}
      </div>
    </form>
  );
}
