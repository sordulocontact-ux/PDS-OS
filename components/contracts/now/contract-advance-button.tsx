"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { advanceContract } from "@/lib/contracts/actions";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/** A step of a contract that asks nothing more (« Soumettre à la
 * direction »): advance_contract decides; its refusal reads under it. */
export function ContractAdvanceButton({
  contractId,
  action,
  label,
}: {
  contractId: string;
  action: "submit";
  label: string;
}) {
  const submit = useWriteSubmit(undefined, fr.contracts.now.done[action]);
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          disabled={submit.pending}
          aria-busy={submit.pending || undefined}
          onClick={() =>
            submit.run(() => advanceContract({ contractId, action }))
          }
        >
          {label}
        </Button>
      </div>
      <FormMessage kind="error">{submit.error}</FormMessage>
    </div>
  );
}
