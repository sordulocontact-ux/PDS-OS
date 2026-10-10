"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "sonner";

import { PressContactForm } from "@/components/strategy/press-kit/press-contact-form";
import { useDraftSave } from "@/components/strategy/release-plan/use-draft-save";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type {
  PressContact,
  PressLink,
} from "@/lib/strategy/documents/press-kit-model";

const isHttps = (url: string) => /^https:\/\/[^\s"'<>]+$/i.test(url);

/**
 * Step 3 of the Dossier de presse (ticket § 12): the listening links the
 * project really has (release, smartlink, artist on Deezer — none is made
 * up), those the owner adds, and the press contacts (the project's owner by
 * default).
 */
export function PressLinksStep({
  projectId,
  initialLinks,
  initialContacts,
  nextHref,
  canEdit,
}: {
  projectId: string;
  initialLinks: PressLink[];
  initialContacts: PressContact[];
  nextHref: string;
  canEdit: boolean;
}) {
  const t = fr.strategyPressKit.links;
  const a = fr.strategyReleasePlan.actions;
  const { pending, save } = useDraftSave(projectId, "press_kit");
  const [links, setLinks] = useState(initialLinks);
  const [contacts, setContacts] = useState(initialContacts);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  return (
    <section aria-labelledby="press-links" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 id="press-links" className="text-display-sm font-semibold">
          {t.title}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.body}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-body-md font-semibold">{t.listen}</h3>
        {links.length === 0 ? (
          <ToneCallout tone="neutral">{t.noLinks}</ToneCallout>
        ) : (
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li
                key={link.url}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{link.label}</span>
                  <span className="text-caption break-all text-muted-foreground">
                    {link.url}
                  </span>
                </span>
                {canEdit && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.removeLink(link.label)}
                    onClick={() =>
                      setLinks((l) => l.filter((x) => x.url !== link.url))
                    }
                  >
                    <IconTrash aria-hidden className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const value = url.trim();
              if (!label.trim() || !isHttps(value))
                return void toast.error(t.linkInvalid);
              if (!links.some((l) => l.url === value))
                setLinks((l) => [...l, { label: label.trim(), url: value }]);
              setLabel("");
              setUrl("");
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="press-link-label">{t.linkLabel}</Label>
              <Input
                id="press-link-label"
                value={label}
                maxLength={80}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="press-link-url">{t.linkUrl}</Label>
              <Input
                id="press-link-url"
                type="url"
                inputMode="url"
                value={url}
                placeholder="https://…"
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              {t.addLink}
            </Button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-body-md font-semibold">{t.contacts}</h3>
        {contacts.length === 0 && (
          <ToneCallout tone="warning">{t.noContacts}</ToneCallout>
        )}
        <ul className="flex flex-col gap-2">
          {contacts.map((c, i) => (
            <li
              key={`${c.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">{c.name}</span>
                <span className="text-caption text-muted-foreground">
                  {[c.role, c.email, c.phone].filter(Boolean).join(" · ")}
                </span>
              </span>
              {canEdit && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t.removeContact(c.name)}
                  onClick={() =>
                    setContacts((l) => l.filter((_, j) => j !== i))
                  }
                >
                  <IconTrash aria-hidden className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <PressContactForm
            onAdd={(contact) => setContacts((l) => [...l, contact])}
          />
        )}
      </div>

      {canEdit && (
        <Button
          type="button"
          className="self-start"
          disabled={pending}
          onClick={() =>
            save({ links, contacts, linksConfirmed: true }, nextHref)
          }
        >
          {pending ? a.saving : a.validate}
        </Button>
      )}
    </section>
  );
}
