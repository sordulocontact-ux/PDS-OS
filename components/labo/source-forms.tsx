import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labo } from "@/lib/i18n/fr/labo";

const fr = { labo };

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

type Submit = (event: FormEvent<HTMLFormElement>) => void;

/** The two ways to feed the bench: an audio file, or a pasted transcript. */
export function SourceForms({
  busy,
  transcribing,
  onTranscribe,
  onPaste,
}: {
  busy: boolean;
  transcribing: boolean;
  onTranscribe: Submit;
  onPaste: Submit;
}) {
  const t = fr.labo;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t.audio.title}</CardTitle>
          <CardDescription>{t.audio.hint}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onTranscribe} className="grid gap-3">
            <label htmlFor="audio" className="text-sm font-medium">
              {t.audio.label}
            </label>
            <input
              id="audio"
              name="audio"
              type="file"
              accept="audio/*,video/mp4"
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5"
            />
            <Button
              type="submit"
              disabled={busy}
              className="justify-self-start"
            >
              {transcribing ? t.audio.pending : t.audio.submit}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.paste.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onPaste} className="grid gap-3">
            <label htmlFor="text" className="text-sm font-medium">
              {t.paste.label}
            </label>
            <textarea
              id="text"
              name="text"
              rows={4}
              placeholder={t.paste.placeholder}
              className={fieldClass}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={busy}
              className="justify-self-start"
            >
              {t.paste.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
