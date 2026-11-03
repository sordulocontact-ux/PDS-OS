"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { masterListen } from "@/lib/i18n/fr/master-listen";
import { sendListenFeedback } from "@/lib/master-workflow/listen-actions";

const fr = { masterListen };

const t = fr.masterListen;

/** « Minutage » + « Votre retour » + « Envoyer mon retour » (proto). */
export function ListenForm({
  token,
  versionId,
  validator,
}: {
  token: string;
  versionId: string;
  validator: string | null;
}) {
  const [timecode, setTimecode] = useState("");
  const [body, setBody] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // One key per feedback: a double click never sends it twice.
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());
  const missing = !body.trim();
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (missing) return;
        setError(null);
        start(async () => {
          const result = await sendListenFeedback(token, {
            versionId,
            timecode,
            body,
            clientKey,
          });
          if (!result.ok) return setError(result.error);
          toast.success(t.sent, { description: t.sentLine(validator) });
          setBody("");
          setTimecode("");
          setTried(false);
          setClientKey(crypto.randomUUID());
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
        <Field
          name="timecode"
          label={t.timecode}
          inputMode="numeric"
          placeholder={t.timecodePlaceholder}
          value={timecode}
          onChange={(e) => setTimecode(e.target.value)}
        />
        <TextareaField
          name="feedback"
          label={t.feedback}
          aria-required
          rows={2}
          maxLength={2000}
          placeholder={t.feedbackPlaceholder}
          value={body}
          error={tried && missing ? t.bodyMissing : undefined}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button type="submit" className="self-start" disabled={pending}>
        {t.send}
      </Button>
    </form>
  );
}
