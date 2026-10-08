"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { assignRole, releaseRole } from "@/lib/framing/actions/team-roles";
import type { FramingData } from "@/lib/framing/queries";
import type { RoleCard } from "@/lib/framing/team-board";
import {
  TEAM_ROLE_KEYS,
  isEngineerRole,
  type TeamRoleKey,
} from "@/lib/framing/team-roles";
import { fr } from "@/lib/i18n/fr";
import type { RankedPerson } from "@/lib/network/ranked-people";
import { listNetworkForRole } from "@/lib/network/role-people-actions";
import type { NetworkRole } from "@/lib/network/types";

/**
 * Gives a role to someone already in the team (one click) or to a person or
 * structure of the Réseau (Sacha, 07/10/2026: picked, its contact kept in
 * project_team_members.contact_id; a name only as a last resort).
 * `card` fixes the role; without it, the role is chosen first.
 */
export function AssignRoleDialog({
  projectId,
  card,
  team,
  roles = TEAM_ROLE_KEYS,
  engineers = [],
  open,
  onOpenChange,
}: {
  projectId: string;
  card: RoleCard | null;
  team: FramingData["team"];
  // The roles offered when none is fixed.
  roles?: readonly TeamRoleKey[];
  // Engineers of the Réseau, listed first for the mix and mastering roles.
  engineers?: Array<{ id: string; name: string }>;
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
        roles={roles}
        engineers={engineers}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

// The role a contact added to the Réseau from here starts with, and whose
// holders the picker lists first.
const NETWORK_ROLE_OF: Record<TeamRoleKey, NetworkRole> = {
  artistic_direction: "other",
  creative_direction: "other",
  clip_production: "videographer",
  press_relations: "provider",
  influence_marketing: "provider",
  playlisting: "provider",
  mix_engineer: "engineer",
  mastering_engineer: "engineer",
};

type Picked = { contactId: string | null; name: string };

function AssignForm({
  projectId,
  card,
  team,
  roles,
  engineers,
  onDone,
}: {
  projectId: string;
  card: RoleCard | null;
  team: FramingData["team"];
  roles: readonly TeamRoleKey[];
  engineers: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const t = fr.framingGuide.team;
  const { pending, run } = useFramingAction();
  const [role, setRole] = useState<TeamRoleKey>(card?.role ?? roles[0]);
  // The current holder, when someone outside the team: picked again.
  const holder = card?.member && !card.member.person_id ? card.member : null;
  const [picked, setPicked] = useState<Picked>({
    contactId: holder?.contact_id ?? null,
    name: holder?.display_name ?? "",
  });
  const people = team.filter((m) => m.role_key !== role);
  const roleOptions = Object.fromEntries(
    roles.map((key) => [key, t.roles[key]]),
  );
  const networkRole = NETWORK_ROLE_OF[role];
  const name = picked.name.trim();

  // The page's engineers (those PDS worked with most) first for these roles.
  const load = async () => {
    const options = await listNetworkForRole(networkRole);
    if (!isEngineerRole(role)) return options;
    const rank = (id: string) => {
      const index = engineers.findIndex((engineer) => engineer.id === id);
      return index === -1 ? engineers.length : index;
    };
    return [...options].sort((a, b) => rank(a.id) - rank(b.id));
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            assignRole(
              projectId,
              role,
              picked.contactId ? { contactId: picked.contactId } : { name },
            ),
          onDone,
        );
      }}
    >
      {!card && (
        <div className="grid gap-1.5">
          <Label htmlFor="assign-role" required>
            {t.role}
          </Label>
          <OptionSelect
            id="assign-role"
            required
            label={t.role}
            options={roleOptions}
            value={role}
            onChange={(v) => {
              const next = v as TeamRoleKey;
              if (NETWORK_ROLE_OF[next] !== networkRole)
                setPicked({ contactId: null, name: "" });
              setRole(next);
            }}
          />
        </div>
      )}
      {people.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-muted-foreground">{t.team}</p>
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
        </div>
      )}
      <PersonPickerField<RankedPerson>
        key={networkRole}
        refName="assign-contact"
        nameName="assign-name"
        legend={t.person}
        load={load}
        defaultRef={picked.contactId}
        defaultName={picked.contactId ? null : picked.name || null}
        createRoles={[networkRole]}
        required
        refOfContact={(id) => id}
        onPick={(option, typed) =>
          setPicked({ contactId: option?.id ?? null, name: typed })
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending || (!picked.contactId && name === "")}
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
