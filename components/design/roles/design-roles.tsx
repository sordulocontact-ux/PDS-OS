import { ResponsiblePicker } from "@/components/design/people/responsible-picker";
import { ValidatorsPicker } from "@/components/design/people/validators-picker";
import {
  RolesPanel,
  type RoleRow,
  type RolesPanelProps,
} from "@/components/shell/module/roles-panel";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import type { Member } from "@/lib/framing/related";
import type { ScopePeople } from "@/lib/design/people";
import { roles } from "@/lib/i18n/fr/roles";
import { formatDayMonth } from "@/lib/utils/instant";

const fr = { roles };

const t = fr.roles.design;

type Props = {
  projectId: string;
  scope: "direction" | "sheet";
  sheetId: string | null;
  people: ScopePeople;
  ownerName: string | null;
  members: Member[];
  suggestions: Member[];
  // The owner, while the Conception is in progress: « Changer ».
  canAssign: boolean;
  canEditValidators: boolean;
  // « Responsable de la fiche » rather than « Responsable ».
  responsibleLabel?: string;
  // Each person's page by project (lot 11, `ContactLinksSection`).
  personLinks?: React.ReactNode;
};

/** « Qui fait quoi » of a Conception scope (MKT-C2-08, sub-lot C7) on the
 * common `RolesPanel`: the project's owner, the responsible, the
 * validators, each « Changer » opening the Conception's own form. */
export function DesignRoles(props: Props) {
  return <RolesPanel {...designRoles(props)} />;
}

export function DesignWhoDoesWhatButton(props: Props) {
  return <WhoDoesWhatButton {...designRoles(props)} />;
}

function designRoles(p: Props): RolesPanelProps {
  const { responsible, validators } = p.people;
  const roles: RoleRow[] = [
    {
      key: "owner",
      label: t.owner,
      kind: "coord",
      holder: p.ownerName ? { name: p.ownerName } : null,
      what: t.owners,
    },
    {
      key: "responsible",
      label: p.responsibleLabel ?? t.responsible,
      kind: "exec",
      holder: responsible
        ? {
            name: responsible.name,
            detail: t.since(formatDayMonth(responsible.since)),
          }
        : null,
      what: t.responsibleWhat,
      action: p.canAssign ? (
        <ResponsiblePicker
          projectId={p.projectId}
          scope={p.scope}
          sheetId={p.sheetId}
          current={responsible}
          members={p.members}
          suggestions={p.suggestions}
          canAssign
          compact
        />
      ) : undefined,
    },
    ...(validators.length ? validators : [null]).map((v, i): RoleRow => ({
      key: `validator-${v?.personId ?? "none"}`,
      label: t.validator,
      kind: "valid",
      holder: v ? { name: v.name } : null,
      what: t.validatorWhat,
      action:
        i === 0 && p.canEditValidators ? (
          <ValidatorsPicker
            projectId={p.projectId}
            scope={p.scope}
            sheetId={p.sheetId}
            validators={validators}
            members={p.members}
            canEdit
            compact
          />
        ) : undefined,
    })),
  ];
  return { roles, personLinks: p.personLinks };
}
