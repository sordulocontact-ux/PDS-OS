"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { VersionCard } from "@/components/ui/version-card";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { addMixComment } from "@/lib/master-workflow/mix-actions";
import {
  formatTimecode,
  parseTimecode,
  type MixVersion,
} from "@/lib/master-workflow/mix-types";
import { transmitFeedback } from "@/lib/master-workflow/round-actions";

import { VersionComments } from "./version-comments";

const fr = { masterRound };

const t = fr.masterRound;

/** The team's feedback on a version, with its timecode and author, the
 * text sent to the engineer prepared by the code (every line keeps its
 * author: no model rewrites it). */
const feedbackText = (version: MixVersion) =>
  version.comments
    .map(
      (c) =>
        `${c.timecodeSeconds !== null ? `${formatTimecode(c.timecodeSeconds)} · ` : ""}${c.body}${c.author ? ` (${c.author})` : ""}`,
    )
    .join("\n");

/**
 * « Retours sur le Mix V1 » (proto, rule 21): the feedback with its
 * timecode, who and when, « Ajouter mon retour » for every member, the
 * reminder that it stays in the team, and for the owner who is not the
 * validator « Transmettre les retours sans décider ».
 */
export function VersionFeedback({
  projectId,
  label,
  version,
  engineer,
  validator,
  canTransmit,
}: {
  projectId: string;
  label: string;
  version: MixVersion;
  engineer: string;
  validator: string;
  // The owner, the version undecided, its feedback not sent yet.
  canTransmit: boolean;
}) {
  const [timecode, setTimecode] = useState("");
  const [body, setBody] = useState("");
  const [timecodeError, setTimecodeError] = useState<string>();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const add = useWriteSubmit(() => {
    setTimecode("");
    setBody("");
    setKey(crypto.randomUUID());
  }, t.feedback.added);
  const [text, setText] = useState(() => feedbackText(version));
  const [tried, setTried] = useState(false);
  const send = useWriteSubmit(() => undefined, t.transmit.done);
  return (
    <section className="flex flex-col gap-3">
      <VersionComments
        comments={version.comments}
        engineer={engineer}
        title={t.feedback.title(label, version.number)}
      />
      <form
        noValidate
        className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]"
        onSubmit={(event) => {
          event.preventDefault();
          const seconds = parseTimecode(timecode);
          if (Number.isNaN(seconds))
            return setTimecodeError(t.feedback.timecodeError);
          setTimecodeError(undefined);
          if (!body.trim()) return;
          add.run(() =>
            addMixComment(projectId, version.id, body, seconds, key),
          );
        }}
      >
        <Field
          name={`timecode-${version.id}`}
          label={t.feedback.timecode}
          placeholder={t.feedback.timecodeHint}
          value={timecode}
          error={timecodeError}
          onChange={(e) => setTimecode(e.target.value)}
        />
        <Field
          name={`comment-${version.id}`}
          label={t.feedback.body}
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex flex-col gap-2 sm:col-span-2">
          <FormMessage kind="error">{add.error}</FormMessage>
          <Button
            type="submit"
            variant="outline"
            className="self-start"
            disabled={add.pending}
          >
            {t.feedback.add}
          </Button>
        </div>
      </form>
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.feedback.teamOnly(engineer, validator)}
      </p>
      {canTransmit && (
        <VersionCard
          title={t.transmit.title}
          meta={t.transmit.meta(engineer, validator)}
        >
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setTried(true);
              if (!text.trim()) return;
              send.run(() => transmitFeedback(projectId, version.id, text));
            }}
          >
            <TextareaField
              name={`transmit-${version.id}`}
              label={t.transmit.text}
              hint={t.transmit.hint(engineer)}
              required
              rows={4}
              maxLength={4000}
              value={text}
              error={tried && !text.trim() ? t.transmit.error : undefined}
              onChange={(e) => setText(e.target.value)}
            />
            <FormMessage kind="error">{send.error}</FormMessage>
            <Button
              type="submit"
              className="self-start"
              disabled={send.pending}
            >
              {t.transmit.button(engineer)}
            </Button>
          </form>
        </VersionCard>
      )}
    </section>
  );
}
