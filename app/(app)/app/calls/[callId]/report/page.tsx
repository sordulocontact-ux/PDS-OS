import { ReportView } from "@/components/calls/closure/report-view";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { formatDay } from "@/lib/assistant/facts";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { scopedReport, type ReportScope } from "@/lib/calls/closure";
import { loadCallClosures } from "@/lib/calls/closure-queries";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `${fr.calls.closure.page.title} · ${fr.app.name}`,
};

/**
 * A call's closed report as a member it was shared with reads it
 * (PROJ-AMEL-01): the latest version they may read, in the scope shared,
 * never the transcription nor the audio. Whoever sees the call reads it in
 * full. RLS decides.
 */
export default async function CallReportPage({
  params,
}: PageProps<"/app/calls/[callId]/report">) {
  await requireApproved();
  const { callId } = await params;
  const t = fr.calls.closure;
  const supabase = await createClient();
  const [{ data: call }, { closures, shares }] = await Promise.all([
    supabase.from("calls").select("id").eq("id", callId).maybeSingle(),
    loadCallClosures(callId),
  ]);
  const closure = closures[0];
  if (!closure)
    return (
      <PageContainer>
        <PageHeader title={t.page.title} />
        <EmptyNote>{t.page.notShared}</EmptyNote>
      </PageContainer>
    );
  const scope: ReportScope =
    call || shares.some((s) => s.closureId === closure.id && s.scope === "full")
      ? "full"
      : "summary";
  const content = scopedReport(closure.content, scope);
  return (
    <PageContainer>
      <PageHeader
        title={closure.content.call?.title ?? t.page.title}
        description={t.closedOn(
          closure.version,
          formatDay(closure.closedAt),
          closure.closedByName,
        )}
        action={
          <a
            href={routes.callReportPdf(callId, closure.version, scope)}
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            <ButtonRoll>{t.pdf}</ButtonRoll>
          </a>
        }
      />
      <ReportView content={content} />
    </PageContainer>
  );
}
