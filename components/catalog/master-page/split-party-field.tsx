"use client";

import { PersonPickerField } from "@/components/network/person-picker-field";
import { listSplitParties } from "@/lib/catalog/master/party-actions";
import type {
  MasterSplit,
  SplitKind,
  SplitRole,
} from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";
import type { NetworkRole } from "@/lib/network/types";

const fr = { masterPage };

// The people a kind of share is about, first: the work's creators for the
// publishing, the recording's artists and labels for the master.
const ORDER: Record<SplitKind, Array<"credit" | "artist" | "network">> = {
  publishing: ["credit", "network", "artist"],
  master: ["artist", "network", "credit"],
};

// The role a new contact of the Réseau starts with, from the share's role.
const NETWORK_ROLE: Partial<Record<SplitRole, NetworkRole>> = {
  label: "label",
  artist: "artist",
  producer: "producer",
  author: "songwriter",
  composer: "songwriter",
};

/** Who a share of a title goes to (Sacha, 05/10/2026): someone credited,
 * an artist of the title or a contact of the Réseau, so no namesake is
 * typed again; added to the Réseau if missing; or only a name. */
export function SplitPartyField({
  masterId,
  kind,
  role,
  split,
  defaultName,
  error,
}: {
  masterId: string;
  kind: SplitKind;
  role: SplitRole;
  split: MasterSplit | null;
  defaultName: string | null;
  error?: string;
}) {
  const ref = split?.contactId
    ? `contact:${split.contactId}`
    : split?.artistId
      ? `artist:${split.artistId}`
      : null;
  return (
    <PersonPickerField
      refName="partyRef"
      nameName="party"
      legend={fr.masterPage.splits.fields.party}
      required
      load={async () => {
        const parties = await listSplitParties(masterId);
        const rank = (g: (typeof parties)[number]["group"]) =>
          ORDER[kind].indexOf(g);
        return [...parties].sort((a, b) => rank(a.group) - rank(b.group));
      }}
      defaultRef={ref}
      defaultName={defaultName}
      createRoles={[NETWORK_ROLE[role] ?? "other"]}
      createKind={
        role === "label" || role === "publisher" ? "organization" : "person"
      }
      refOfContact={(id) => `contact:${id}`}
      error={error}
    />
  );
}
