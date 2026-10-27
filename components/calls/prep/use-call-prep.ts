"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { routes } from "@/lib/auth/redirects";
import { createPreparedCall } from "@/lib/calls/prep/actions";
import { instantOfInputs } from "@/lib/calls/prep/dates";
import type {
  CallPrepDefaults,
  PrepFormat,
  PrepPerson,
} from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { useAgendaDraft } from "./use-agenda-draft";

const fr = { callPrep };

export type PrepErrors = Partial<
  Record<"people" | "date" | "time" | "goal" | "link", string>
>;

/**
 * The state of the common call form: what the module proposed, what the
 * person changes, the check before the summary (each missing field in red
 * with its reason, never before the first try) and « Confirmer et inviter ».
 * `stay`: the call is shown where it was prepared; else its page opens.
 */
export function useCallPrep(
  defaults: CallPrepDefaults,
  options: {
    stay: boolean;
    agenda?: CallPrepDefaults["agenda"];
    goal?: string;
    extraIds: string[];
  },
) {
  const t = fr.callPrep;
  const router = useRouter();
  const [people, setPeople] = useState<PrepPerson[]>(() =>
    defaults.attendeeKeys.flatMap((key) =>
      defaults.people.filter((p) => p.key === key),
    ),
  );
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [format, setFormat] = useState<PrepFormat>(defaults.format);
  const [link, setLink] = useState("");
  const [ownGoal, setGoal] = useState<string | null>(null);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [detailed, setDetailed] = useState(false);
  const [recap, setRecap] = useState(false);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const agenda = useAgendaDraft(options.agenda ?? defaults.agenda);
  const goal = ownGoal ?? options.goal ?? defaults.goal;

  const check = (): PrepErrors => ({
    ...(people.length < 2 ? { people: t.tooFew } : {}),
    ...(date ? {} : { date: t.dateMissing }),
    ...(time ? {} : { time: t.timeMissing }),
    ...(goal.trim() ? {} : { goal: t.goalMissing }),
    ...(link.trim() && !/^https:\/\/\S+$/.test(link.trim())
      ? { link: t.linkInvalid }
      : {}),
  });
  const errors = tried ? check() : {};

  const review = () => {
    setTried(true);
    const found = check();
    const first = (["people", "date", "time", "link", "goal"] as const).find(
      (k) => found[k],
    );
    if (first) {
      setTimeout(
        () => document.getElementById(`call-prep-${first}`)?.focus(),
        0,
      );
      return;
    }
    setRecap(true);
  };

  const confirm = () => {
    const occurredAt = instantOfInputs(date, time);
    if (!occurredAt) return setRecap(false);
    setError(null);
    startTransition(async () => {
      const result = await createPreparedCall({
        kind: defaults.kind,
        projectId: defaults.projectId,
        target: defaults.target,
        title: defaults.title,
        occurredAt,
        format,
        meetingUrl: format === "video" ? link.trim() : "",
        goal: goal.trim(),
        attendeeKeys: people.map((p) => p.key),
        agenda: agenda.items.map(({ key, topic, minutes }) => ({
          key,
          topic,
          minutes,
        })),
        detailed,
        documentIds,
        extraIds: options.extraIds,
      });
      if (!result.ok) return setError(result.error);
      toast.success(t.created[defaults.noun]);
      if (!options.stay)
        router.push(routes.projectCall(defaults.projectId, result.callId));
    });
  };

  return {
    people,
    setPeople,
    date,
    setDate,
    time,
    setTime,
    format,
    setFormat,
    link,
    setLink,
    goal,
    setGoal,
    documentIds,
    setDocumentIds,
    detailed,
    setDetailed,
    agenda,
    recap,
    setRecap,
    errors,
    tried,
    error,
    pending,
    review,
    confirm,
  };
}
