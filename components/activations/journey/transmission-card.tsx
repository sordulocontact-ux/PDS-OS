"use client";

import { useRouter } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { VersionCard } from "@/components/ui/version-card";
import { declareTransmission } from "@/lib/activations/journey-actions";
import { fr } from "@/lib/i18n/fr";
import { formatShortInstant } from "@/lib/utils/day";

const t = fr.activationJourney.pressBlock;

/**
 * « Transmission à l'agence » (proto rpKit, agency): the agency has no
 * account, the framing and the press kit leave PDS OS by hand; a person
 * declares it once both are validated.
 */
export function TransmissionCard({
  projectId,
  activationId,
  agency,
  ready,
  canWrite,
  done,
}: {
  projectId: string;
  activationId: string;
  agency: string | null;
  ready: boolean;
  canWrite: boolean;
  done: { by: string; at: string } | null;
}) {
  const router = useRouter();
  const { pending, error, run } = useWriteSubmit(() => router.refresh(), "");
  return (
    <VersionCard
      id="transmit"
      title={t.transmission(agency ?? t.transmissionAgency)}
      status={
        done
          ? { tone: "success", label: fr.activationJourney.done.transmitted }
          : null
      }
      defaultOpen={!done && ready}
      className="scroll-mt-5"
    >
      {done ? (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.transmitted(done.by, formatShortInstant(done.at))}
        </p>
      ) : (
        <>
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.transmissionHint}
          </p>
          {canWrite && ready && (
            <div>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => declareTransmission({ projectId, activationId }))
                }
              >
                {t.transmit}
              </Button>
            </div>
          )}
          {error && <FormMessage kind="error">{error}</FormMessage>}
        </>
      )}
    </VersionCard>
  );
}
