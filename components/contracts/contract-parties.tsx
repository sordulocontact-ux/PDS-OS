"use client";

import { IconOffice, IconUser, IconXmark } from "nucleo-sharp-essential";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { AddPartyForm } from "@/components/contracts/add-party-form";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { removeContractParty } from "@/lib/contracts/actions";
import type { ContractParty } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/**
 * Who the contract binds: contacts of the network with their role in it,
 * each one opening its network page. Its writer adds one (`AddPartyForm`)
 * or removes one.
 */
export function ContractParties({
  contractId,
  parties,
  canEdit,
}: {
  contractId: string;
  parties: ContractParty[];
  canEdit: boolean;
}) {
  const t = fr.contracts.parties;
  const [pending, startTransition] = useTransition();

  function remove(contactId: string) {
    startTransition(async () => {
      const result = await removeContractParty(contractId, contactId);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <PageSection
      id="contract-parties"
      title={t.title}
      description={t.description}
    >
      {parties.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {parties.map((party) => {
            const Icon = party.kind === "organization" ? IconOffice : IconUser;
            return (
              <li
                key={party.contactId}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-border px-3 py-2"
              >
                <Icon
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground"
                />
                <Link
                  href={routes.networkContact(party.contactId)}
                  className="flex min-w-0 flex-1 flex-col rounded-md outline-none hover:underline focus-visible:underline"
                >
                  <span className="truncate text-sm font-medium">
                    {party.name}
                  </span>
                  {party.role && (
                    <span className="truncate text-sm text-muted-foreground">
                      {party.role}
                    </span>
                  )}
                </Link>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.remove(party.name)}
                    disabled={pending}
                    onClick={() => remove(party.contactId)}
                  >
                    <IconXmark aria-hidden />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canEdit && (
        // Mounted again when the parties change: the picker reads them again.
        <AddPartyForm
          key={parties.map((party) => party.contactId).join()}
          contractId={contractId}
        />
      )}
    </PageSection>
  );
}
