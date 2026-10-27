"use client";

import { useEffect, useState } from "react";

import { PersonPickerField } from "@/components/network/person-picker-field";
import {
  listSessionEngineers,
  type EngineerSuggestion,
} from "@/lib/catalog/master/engineer-actions";
import type { SessionKind } from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { network } from "@/lib/i18n/fr/network";
import type { RankedPerson } from "@/lib/network/ranked-people";

const fr = { network, masterPage };

type Loaded = {
  options: RankedPerson[];
  suggested: Partial<Record<SessionKind, EngineerSuggestion>>;
};

/**
 * The engineer of a session, picked in the Réseau (Sacha, 07/10/2026): the
 * engineers credited on the title first, then the Réseau's engineers. With
 * no engineer saved, the one PDS knows for that kind of session (credit, or
 * the Brief Mix/Master) is proposed, and follows the kind until the user
 * picks. The name chosen is saved (`engineer`) and, when picked in the
 * Réseau, its contact too (`engineerRef` → engineer_contact_id, retour 31):
 * a name kept alone can be linked later without retyping.
 */
export function SessionEngineerField({
  masterId,
  kind,
  defaultName,
  defaultRef = null,
  error,
}: {
  masterId: string;
  kind: SessionKind;
  // The saved or typed name, "" when none.
  defaultName: string;
  // The saved contact of the Réseau, if any.
  defaultRef?: string | null;
  error?: string;
}) {
  const t = fr.masterPage.sessions;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // The kind the field was at when the user picked: it stops following.
  const [frozen, setFrozen] = useState<SessionKind | null>(null);

  useEffect(() => {
    let live = true;
    listSessionEngineers(masterId).then((data) => live && setLoaded(data));
    return () => {
      live = false;
    };
  }, [masterId]);

  if (!loaded)
    return (
      <p className="text-sm text-muted-foreground">
        {fr.network.picker.loading}
      </p>
    );

  const suggestion =
    defaultName || frozen ? null : (loaded.suggested[kind] ?? null);
  return (
    <div className="flex flex-col gap-1.5">
      <PersonPickerField<RankedPerson>
        key={defaultName ? "saved" : (frozen ?? kind)}
        refName="engineerRef"
        nameName="engineer"
        legend={t.fields.engineer}
        load={async (fresh) =>
          fresh
            ? (await listSessionEngineers(masterId)).options
            : loaded.options
        }
        defaultRef={defaultRef ?? suggestion?.ref ?? null}
        defaultName={defaultName || suggestion?.name || null}
        createRoles={["engineer"]}
        refOfContact={(id) => id}
        onPick={() => setFrozen((current) => current ?? kind)}
        error={error}
      />
      {suggestion && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {t.engineerSuggested(suggestion.name)}
        </p>
      )}
    </div>
  );
}
