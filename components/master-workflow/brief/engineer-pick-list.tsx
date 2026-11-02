"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { CreateContactDialog } from "@/components/network/create-contact-dialog";
import { Button } from "@/components/ui/button";
import { PickList } from "@/components/ui/pick-list";
import { usePickListDone } from "@/components/ui/pick-list-context";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { masterBrief } from "@/lib/i18n/fr/master-brief";
import type { BriefPerson } from "@/lib/master-workflow/brief-types";
import type {
  NetworkEngineer,
  NetworkOther,
} from "@/lib/master-workflow/types";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { masterBrief };

const t = fr.masterBrief.picker;

/**
 * « Changer » the engineer of the mix or the mastering (Sacha, 02/11/2026):
 * the engineers of the Réseau first, then the members of PDS, then — once a
 * name is typed — the rest of the Réseau, who becomes an engineer when
 * chosen (the server adds the role). « Ajouter « X » au Réseau » creates
 * the contact as an engineer without leaving, then chooses them. A member
 * is chosen as `person:<id>`, a contact by its id.
 */
export function EngineerPickList({
  engineers,
  others,
  members,
  selectedId,
  canAddContact,
  onChoose,
}: {
  engineers: NetworkEngineer[];
  others: NetworkOther[];
  members: BriefPerson[];
  selectedId: string | null;
  canAddContact: boolean;
  onChoose: (id: string) => Promise<WriteResult>;
}) {
  const closeHost = usePickListDone();
  const [creating, setCreating] = useState<string | null>(null);
  const { pending, error, run } = useWriteSubmit(
    closeHost,
    fr.masterBrief.changed,
  );
  const avatar = { pictureUrl: null };

  return (
    <>
      <PickList
        searchable
        searchLabel={t.search}
        selectedId={selectedId}
        done={fr.masterBrief.changed}
        onChoose={onChoose}
        groups={[
          {
            label: t.network,
            options: engineers.map((e) => ({
              id: e.id,
              label: e.name,
              detail: [e.structure, e.city, e.history]
                .filter(Boolean)
                .join(" · "),
              avatar,
            })),
          },
          {
            label: t.members,
            options: members.map((m) => ({
              id: `person:${m.personId}`,
              label: m.name,
              avatar,
            })),
          },
          {
            label: t.others,
            searchOnly: true,
            options: others.map((o) => ({
              id: o.id,
              label: o.name,
              detail: o.detail,
              avatar,
            })),
          },
        ]}
        footer={
          canAddContact
            ? (query) => (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    disabled={pending}
                    onClick={() => setCreating(query.trim())}
                  >
                    {t.create(query.trim())}
                  </Button>
                  <FormMessage kind="error">{error}</FormMessage>
                </div>
              )
            : undefined
        }
      />
      <CreateContactDialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        name={creating ?? ""}
        roles={["engineer"]}
        title={t.createTitle}
        onCreated={(id) => {
          setCreating(null);
          run(() => onChoose(id));
        }}
      />
    </>
  );
}
