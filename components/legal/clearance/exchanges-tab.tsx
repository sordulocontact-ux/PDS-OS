"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { logExchange } from "@/lib/legal/clearance/actions";
import {
  readClearanceMessage,
  type MessageProposal,
} from "@/lib/legal/clearance/interpret";
import {
  DIRECTIONS,
  EXCHANGE_KINDS,
  isClosed,
  type Direction,
  type ExchangeKind,
} from "@/lib/legal/clearance/matrix";
import type { Clearance } from "@/lib/legal/clearance/types";
import { formatDateTime } from "@/lib/release/format";

import { ExchangeProposal } from "./exchange-proposal";
import { useLegalAction } from "@/components/legal/use-legal-action";

/** « Échanges » : the journal (messages, calls, notes), a new one written
 * freely, which PO can read into proposals before it is added. */
export function ExchangesTab({
  projectId,
  clearance,
}: {
  projectId: string;
  clearance: Clearance;
}) {
  const t = fr.legalClearance;
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<ExchangeKind>("message");
  const [direction, setDirection] = useState<Direction>("out");
  const [proposal, setProposal] = useState<MessageProposal | null>(null);
  const [reading, startReading] = useTransition();
  const { pending, run } = useLegalAction();
  const closed = isClosed(clearance.status);

  const read = () =>
    startReading(async () => {
      const result = await readClearanceMessage(projectId, clearance.id, body);
      if (!result.ok) return void toast.error(result.error);
      setProposal(result.proposal);
      if (result.proposal.outgoing) setDirection("out");
    });

  return (
    <div className="flex flex-col gap-5">
      {!closed && (
        <div className="flex flex-col gap-3">
          <TextareaField
            name={`exchange-${clearance.id}`}
            label={t.exchanges.body}
            rows={4}
            maxLength={8000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionSelect
              name={`kind-${clearance.id}`}
              label={t.exchanges.kind}
              items={Object.fromEntries(
                EXCHANGE_KINDS.map((k) => [k, t.kinds[k]]),
              )}
              defaultValue="message"
              onValueChange={(v) => setKind(v as ExchangeKind)}
            />
            <OptionSelect
              key={direction}
              name={`direction-${clearance.id}`}
              label={t.exchanges.direction}
              items={Object.fromEntries(
                DIRECTIONS.map((d) => [d, t.directions[d]]),
              )}
              defaultValue={direction}
              onValueChange={(v) => setDirection(v as Direction)}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={reading || !body.trim()}
              onClick={read}
            >
              {reading ? t.exchanges.reading : t.exchanges.read}
            </Button>
            <Button
              size="sm"
              disabled={pending || !body.trim()}
              onClick={() =>
                run(
                  () =>
                    logExchange({
                      projectId,
                      clearanceId: clearance.id,
                      kind,
                      direction,
                      body,
                    }),
                  () => setBody(""),
                )
              }
            >
              {t.exchanges.add}
            </Button>
          </div>
          {proposal && (
            <ExchangeProposal
              projectId={projectId}
              clearanceId={clearance.id}
              proposal={proposal}
              communicationId={null}
            />
          )}
        </div>
      )}
      {clearance.exchanges.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.exchanges.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {clearance.exchanges.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 py-3">
              <span className="text-sm text-muted-foreground">
                {t.kinds[e.kind as keyof typeof t.kinds]} ·{" "}
                {t.directions[e.direction as keyof typeof t.directions]} ·{" "}
                {formatDateTime(e.at)}
                {e.by && ` · ${e.by}`}
              </span>
              <span className="break-words whitespace-pre-wrap">{e.body}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
