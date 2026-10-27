"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { sectionCardClass } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timestamp } from "@/components/ui/timestamp";
import { fr } from "@/lib/i18n/fr";
import {
  ENGINEER_SIGNALS,
  type EngineerMessage,
  type EngineerMessageKind,
} from "@/lib/master-workflow/engineer-messages";
import { postEngineerMessage } from "@/lib/master-workflow/transmission-public-actions";
import { engineerSignalTone } from "@/lib/ui/state-tones";

/**
 * The engineer's thread with the label, on their page (PROJ-AMEL-02): every
 * message and signal, dated and staged, and the quick actions « Poser une
 * question », « Signaler un retard » (in days), « Signaler un fichier
 * manquant », or a plain message. The history follows the link from the
 * mix to the mastering.
 */
export function EngineerThread({
  token,
  messages,
}: {
  token: string;
  messages: EngineerMessage[];
}) {
  const t = fr.masterWorkflow.engineerThread;
  const [kind, setKind] = useState<EngineerMessageKind>("question");
  const [body, setBody] = useState("");
  const [days, setDays] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const delayDays = Number(days);
  const daysOk =
    Number.isInteger(delayDays) && delayDays >= 1 && delayDays <= 90;

  function send() {
    setTried(true);
    if (!body.trim() || (kind === "delay" && !daysOk)) return;
    startTransition(async () => {
      const result = await postEngineerMessage({
        token,
        kind,
        body,
        delayDays: kind === "delay" ? delayDays : null,
      });
      if (!result.ok) return setError(result.error);
      setError(null);
      setTried(false);
      setBody("");
      setDays("");
      toast.success(t.sent);
    });
  }

  return (
    <section aria-labelledby="engineer-thread" className={sectionCardClass}>
      <h2 id="engineer-thread" className="text-base font-medium">
        {t.title}
      </h2>
      {messages.length === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id} className="flex flex-col gap-1">
              <p className="flex flex-wrap items-center gap-2 text-caption text-[color:var(--text-secondary)]">
                <span className="font-medium text-foreground">
                  {m.author === "engineer" ? t.you : t.label}
                </span>
                <Timestamp iso={m.createdAt} />
                <span>· {t.stages[m.stage]}</span>
                {m.kind !== "message" && (
                  <StatusBadge
                    tone={engineerSignalTone[m.status ?? "open"]}
                    size="sm"
                  >
                    {t.kinds[m.kind]}
                    {m.delayDays ? ` · ${t.days(m.delayDays)}` : ""}
                  </StatusBadge>
                )}
              </p>
              <p className="text-sm whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ol>
      )}
      <form
        noValidate
        className="mt-5 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <ChipChoice
          name="kind"
          legend={t.bodyLabel}
          options={[...ENGINEER_SIGNALS, "message" as const].map((k) => ({
            value: k,
            label: t.actions[k],
          }))}
          value={kind}
          onChange={(v) => v && setKind(v)}
        />
        {kind === "delay" && (
          <Field
            name="delayDays"
            type="number"
            min={1}
            max={90}
            label={t.delayDays}
            aria-required
            value={days}
            error={tried && !daysOk ? t.delayDaysRequired : undefined}
            onChange={(e) => setDays(e.target.value)}
          />
        )}
        <TextareaField
          name="body"
          label={t.bodyLabel}
          aria-required
          rows={3}
          maxLength={2000}
          placeholder={t.placeholders[kind]}
          value={body}
          error={tried && !body.trim() ? t.invalid : undefined}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button
          type="submit"
          className="self-start"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.send}
        </Button>
      </form>
    </section>
  );
}
