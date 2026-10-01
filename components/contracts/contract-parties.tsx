"use client";

import { IconOffice, IconUser, IconXmark } from "nucleo-sharp-essential";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { addContractParty, removeContractParty } from "@/lib/contracts/actions";
import type { ContractParty } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";

/**
 * Who the contract binds: contacts of the network with their role in it,
 * each one opening its network page. Its writer adds one (a contact and a
 * role) or removes one.
 */
export function ContractParties({
  contractId,
  parties,
  candidates,
  canEdit,
}: {
  contractId: string;
  parties: ContractParty[];
  // Live contacts not yet parties.
  candidates: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const t = fr.contracts.parties;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function add(form: HTMLFormElement) {
    const data = new FormData(form);
    startTransition(async () => {
      const result = await addContractParty({
        contractId,
        contactId: String(data.get("contactId") ?? ""),
        role: String(data.get("role") ?? ""),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  function remove(contactId: string) {
    startTransition(async () => {
      const result = await removeContractParty(contractId, contactId);
      if (!result.ok) toast.error(result.error);
      else router.refresh();
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
      {canEdit &&
        (candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.noContacts}{" "}
            <Link
              href={routes.network}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {t.openNetwork}
            </Link>
          </p>
        ) : (
          <form
            className="grid gap-3 rounded-xl border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              add(event.currentTarget);
            }}
          >
            <OptionSelect
              name="contactId"
              label={t.contact}
              items={Object.fromEntries(candidates.map((c) => [c.id, c.name]))}
              defaultValue={candidates[0]?.id}
            />
            <Field
              name="role"
              label={t.role}
              maxLength={80}
              autoComplete="off"
              placeholder={t.rolePlaceholder}
            />
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? t.pending : t.submit}
            </Button>
          </form>
        ))}
    </PageSection>
  );
}
