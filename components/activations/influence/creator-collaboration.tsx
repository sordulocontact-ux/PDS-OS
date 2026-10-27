import type { CreatorCollaboration } from "@/lib/activations/influence/creator-link";
import { activationCreator } from "@/lib/i18n/fr/activation-creator";

import { CreatorInvoiceForm, CreatorLinkForm } from "./creator-gestures";

const fr = { activationCreator };

const t = fr.activationCreator;

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
    {children}
  </p>
);

/** What a collaboration's card on the creator's page says and offers for
 * her step (proto creatorPortal): deposit the content (with the feedback on
 * the previous version), declare the publication, send the invoice, or
 * nothing to do for now. */
export function creatorCard(token: string, c: CreatorCollaboration) {
  const last = c.contents.at(-1);
  switch (c.step) {
    case "content":
      return {
        title: t.contentTitle,
        state: "todo" as const,
        body: (
          <>
            {last && (
              <Note>
                {t.feedbackOn(last.label)}{" "}
                {[
                  last.comment,
                  ...last.feedback.map((f) =>
                    [f.timecode, f.comment].filter(Boolean).join(" · "),
                  ),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Note>
            )}
            <CreatorLinkForm
              token={token}
              kind="content"
              label={t.videoLink}
              placeholder="https://…"
              submitLabel={t.sendVersion(c.contents.length + 1)}
            />
          </>
        ),
      };
    case "review":
      return {
        title: t.reviewTitle,
        state: "waiting" as const,
        body: <Note>{t.reviewBody(last?.label ?? "V1")}</Note>,
      };
    case "publish":
      return {
        title: t.publishTitle,
        state: "todo" as const,
        body: (
          <>
            <Note>{t.publishBody}</Note>
            <CreatorLinkForm
              token={token}
              kind="publication"
              label={t.publicationLink}
              placeholder="https://www.tiktok.com/@…"
              submitLabel={t.declare}
            />
          </>
        ),
      };
    case "invoice":
      return {
        title: t.invoiceTitle,
        state: "todo" as const,
        body: <CreatorInvoiceForm token={token} />,
      };
    case "published":
      return {
        title: t.publishedTitle,
        state: c.invoiceSent ? ("done" as const) : ("waiting" as const),
        body: (
          <Note>
            {c.invoiceSent
              ? t.invoiceSent
              : t.publishedBody(Boolean(c.publication?.verified))}
          </Note>
        ),
      };
    default:
      return {
        title: t.closedTitle,
        state: "done" as const,
        body: <Note>{t.nothing}</Note>,
      };
  }
}
