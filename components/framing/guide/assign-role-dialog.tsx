"use client";

import { useEffect, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import {
  assignRole,
  listCreativeCandidates,
  releaseRole,
} from "@/lib/framing/actions/team-roles";
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
 * Gives a role to someone already in the team (one click), to a creative
 * director of the app (the project's, then for the artistic and creative
 * direction the organization's: Sacha, 10/10/2026), or to a person or
 * structure of the Réseau (Sacha, 07/10/2026: picked, its contact kept in
 * project_team_members.contact_id; a name only as a last resort).
 * `card` fixes the role; without it, the role is chosen first.
 */
export function AssignRoleDialog({
  projectId,
  card,
  team,
  creatives = [],
  roles = TEAM_ROLE_KEYS,
  engineers = [],
  open,
  onOpenChange,
}: {
  projectId: string;
  card: RoleCard | null;
  team: FramingData["team"];
  // The project's creative directors (members of the app).
  creatives?: Creative[];
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
        creatives={creatives}
        roles={roles}
        engineers={engineers}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

// The roles of the Réseau that fit each role of the team: only their holders
// are listed before typing (no sound engineer offered for the artistic
// direction, Sacha 10/10/2026); typing searches the whole Réseau. The first
// is the role a contact added from here starts with.
const NETWORK_ROLES_OF: Record<TeamRoleKey, readonly NetworkRole[]> = {
  artistic_direction: [
    "art_director",
    "designer",
    "photographer",
    "videographer",
  ],
  creative_direction: [
    "art_director",
    "designer",
    "photographer",
    "videographer",
  ],
  clip_production: ["videographer"],
  // « Prestataire » and « Partenaire » are relation types since the ticket
  // « Retour PO / Réseau » of 11/10/2026: an agency is what they were.
  press_relations: ["media", "journalist", "agency"],
  influence_marketing: ["influencer", "agency", "media"],
  playlisting: ["agency", "media"],
  mix_engineer: ["engineer"],
  mastering_engineer: ["engineer"],
};

type Picked = { contactId: string | null; name: string };
type Creative = { personId: string; name: string };

// Roles a creative director of the app may hold beyond their own project.
const CREATIVE_ROLES: readonly TeamRoleKey[] = [
  "artistic_direction",
  "creative_direction",
];

function AssignForm({
  projectId,
  card,
  team,
  creatives,
  roles,
  engineers,
  onDone,
}: {
  projectId: string;
  card: RoleCard | null;
  team: FramingData["team"];
  creatives: Creative[];
  roles: readonly TeamRoleKey[];
  engineers: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const t = fr.framingGuide.team;
  const { pending, run, error } = useFramingAction({ inline: true });
  const [role, setRole] = useState<TeamRoleKey>(card?.role ?? roles[0]);
  // The current holder, when someone outside the team: picked again.
  const holder = card?.member && !card.member.person_id ? card.member : null;
  const [picked, setPicked] = useState<Picked>({
    contactId: holder?.contact_id ?? null,
    name: holder?.display_name ?? "",
  });
  // Each person of the team once (one row per role they hold), except who
  // holds this role already; picking them adds the role to their others.
  const identityOf = (m: FramingData["team"][number]) =>
    m.person_id ?? m.contact_id ?? m.display_name.trim().toLowerCase();
  const holders = new Set(
    team.filter((m) => m.role_key === role).map(identityOf),
  );
  const people = [
    ...new Map(
      team
        .filter((m) => !holders.has(identityOf(m)))
        .map((m) => [identityOf(m), m]),
    ).values(),
  ];
  // Members of the app with no row in the team yet: the project's creative
  // directors, then (artistic or creative direction) the organization's.
  const [orgCreatives, setOrgCreatives] = useState<Creative[]>([]);
  useEffect(() => {
    void listCreativeCandidates().then(setOrgCreatives);
  }, []);
  const inTeam = new Set(team.map((m) => m.person_id).filter(Boolean));
  const projectCreatives = creatives.filter((c) => !inTeam.has(c.personId));
  const shown = new Set([...inTeam, ...creatives.map((c) => c.personId)]);
  const otherCreatives = CREATIVE_ROLES.includes(role)
    ? orgCreatives.filter((c) => !shown.has(c.personId))
    : [];
  const giveTo = (person: { memberId: string } | { personId: string }) =>
    run(() => assignRole(projectId, role, person), onDone);
  const roleOptions = Object.fromEntries(
    roles.map((key) => [key, t.roles[key]]),
  );
  const networkRoles = NETWORK_ROLES_OF[role];
  const name = picked.name.trim();

  // The page's engineers (those PDS worked with most) first for these roles.
  const load = async () => {
    const options = await listNetworkForRole([...networkRoles]);
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
              if (NETWORK_ROLES_OF[next] !== networkRoles)
                setPicked({ contactId: null, name: "" });
              setRole(next);
            }}
          />
        </div>
      )}
      {(people.length > 0 || projectCreatives.length > 0) && (
        <ChipGroup label={t.team}>
          {people.map((m) => (
            <FilterChip
              key={m.id}
              pressed={false}
              disabled={pending}
              onClick={() => giveTo({ memberId: m.id })}
            >
              {m.display_name}
            </FilterChip>
          ))}
          {projectCreatives.map((c) => (
            <FilterChip
              key={c.personId}
              pressed={false}
              disabled={pending}
              onClick={() => giveTo({ personId: c.personId })}
            >
              {c.name}
            </FilterChip>
          ))}
        </ChipGroup>
      )}
      {otherCreatives.length > 0 && (
        <ChipGroup label={t.creatives}>
          {otherCreatives.map((c) => (
            <FilterChip
              key={c.personId}
              pressed={false}
              disabled={pending}
              onClick={() => giveTo({ personId: c.personId })}
            >
              {c.name}
            </FilterChip>
          ))}
        </ChipGroup>
      )}
      <PersonPickerField<RankedPerson>
        key={role}
        refName="assign-contact"
        nameName="assign-name"
        legend={t.person}
        load={load}
        defaultRef={picked.contactId}
        defaultName={picked.contactId ? null : picked.name || null}
        createRoles={[networkRoles[0]]}
        suggest={(option) => option.group !== "network"}
        required
        refOfContact={(id) => id}
        onPick={(option, typed) =>
          setPicked({ contactId: option?.id ?? null, name: typed })
        }
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
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

function ChipGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
