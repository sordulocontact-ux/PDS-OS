import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProviderSection } from "@/components/production/provider/provider-section";
import { FactList } from "@/components/ui/fact-list";
import { fr } from "@/lib/i18n/fr";
import { getPublicCallSheet } from "@/lib/production/call-sheet/public";
import { formatDate, formatDateTime } from "@/lib/release/format";

const t = fr.productionCallSheetPage;

// The call sheet the team receives (PROD-016), opened from its link without
// an account: always the latest published version. Never indexed.
export const metadata: Metadata = {
  title: `${t.pageTitle} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PublicCallSheetPage({
  params,
}: PageProps<"/fs/[token]">) {
  const { token } = await params;
  const sheet = await getPublicCallSheet(token);
  if (!sheet) notFound();
  if (!sheet.published)
    return (
      <main className="flex flex-1 justify-center bg-muted/40 px-4 py-12">
        <p className="max-w-2xl text-muted-foreground">{t.notPublished}</p>
      </main>
    );
  const c = sheet.content;
  const block = (label: string, value: string | null) => ({
    label,
    value,
    valueClassName: "whitespace-pre-line",
  });
  return (
    <main className="flex flex-1 justify-center bg-muted/40 px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {t.title(c.deliverable)}
          </h1>
          <p className="text-muted-foreground">
            {c.project}
            {c.manager ? ` · ${t.manager(c.manager)}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {t.version(sheet.number, formatDateTime(sheet.publishedAt))}
          </p>
        </header>
        <ProviderSection title={t.essentials}>
          <FactList
            emptyLabel={t.notGiven}
            facts={[
              {
                label: t.date,
                value: c.shootDate ? formatDate(c.shootDate) : null,
              },
              { label: t.callTime, value: c.callTime },
              {
                label: t.place,
                value:
                  [c.location.name, c.location.address]
                    .filter(Boolean)
                    .join(", ") || null,
              },
              block(t.access, c.location.access),
              block(t.schedule, c.schedule),
            ]}
          />
        </ProviderSection>
        <ProviderSection title={t.team}>
          <ul className="flex flex-col gap-2 text-sm">
            {c.team.map((m, i) => (
              <li key={i} className="flex flex-col">
                <span className="font-medium">
                  {m.name} · {m.role}
                </span>
                {(m.phone || m.email) && (
                  <span className="text-muted-foreground">
                    {[m.phone, m.email].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </ProviderSection>
        <ProviderSection title={t.details}>
          <FactList
            emptyLabel={t.notGiven}
            facts={[
              block(t.sequences, c.sequences),
              block(t.instructions, c.instructions),
              block(t.contacts, c.contactsNote),
              block(t.emergencies, c.emergencies),
              block(t.documents, c.documentsNote),
            ]}
          />
        </ProviderSection>
        {c.equipment.length > 0 && (
          <ProviderSection title={t.equipment}>
            <ul className="flex flex-col gap-1 text-sm">
              {c.equipment.map((e, i) => (
                <li key={i}>
                  {e.quantity ? `${e.label} × ${e.quantity}` : e.label}
                  {e.supplier ? ` · ${e.supplier}` : ""}
                </li>
              ))}
            </ul>
          </ProviderSection>
        )}
      </div>
    </main>
  );
}
