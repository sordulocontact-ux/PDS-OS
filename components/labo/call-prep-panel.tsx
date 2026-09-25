"use client";

import { useState } from "react";
import { toast } from "sonner";

import { MetaList } from "@/components/labo/meta-list";
import { Button } from "@/components/ui/button";
import type { PreparedCall } from "@/lib/ai/call-prep";
import type { LocatedCallReport } from "@/lib/ai/call-report";
import { fr } from "@/lib/i18n/fr";
import { requestCallPrep } from "@/lib/labo/client";
import { formatMs } from "@/lib/labo/format";

/** Next-call agenda built from what the report left open. */
export function CallPrepPanel({ report }: { report: LocatedCallReport }) {
  const t = fr.labo.prep;
  const [prepared, setPrepared] = useState<PreparedCall | null | undefined>(
    undefined,
  );
  const [pending, setPending] = useState(false);

  async function onPrepare() {
    setPending(true);
    const result = await requestCallPrep(report);
    setPending(false);
    if (result.ok) setPrepared(result.data.prepared);
    else toast.error(fr.labo.errors[result.error]);
  }

  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <h3 className="text-base font-semibold">{t.title}</h3>
      <Button
        onClick={onPrepare}
        disabled={pending}
        variant="outline"
        className="justify-self-start"
      >
        {pending ? t.pending : t.submit}
      </Button>

      {prepared === null && (
        <p className="text-sm text-muted-foreground">{t.nothing}</p>
      )}

      {prepared && (
        <div className="grid gap-4">
          <MetaList
            items={[
              [fr.labo.meta.model, `${prepared.provider} · ${prepared.model}`],
              [fr.labo.meta.duration, formatMs(prepared.durationMs)],
            ]}
          />
          {prepared.gaps.length > 0 && (
            <p className="text-sm">
              <span className="text-muted-foreground">{t.gaps} : </span>
              {prepared.gaps.map((field) => t.fields[field]).join(", ")}
            </p>
          )}
          <ol className="grid list-decimal gap-3 pl-5 text-sm">
            {prepared.output.agenda.map((item, index) => (
              <li key={index}>
                <p className="font-medium">
                  {item.topic}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    · {t.origins[item.origin]}
                  </span>
                </p>
                <p className="text-muted-foreground">{item.question}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
