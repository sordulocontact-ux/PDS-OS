import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { PageContainer } from "@/components/shell/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

// Frame of the home page (Figma "Desktop - 11", spacing of the proto
// `docs/protos/accueil.html`: 40 px between blocks): centred greeting, then
// one column holding the assistant and the feed. Shared by the page and its
// loading state, so PO can be typed into before the feed has arrived.
export function HomeFrame({
  title,
  subtitle,
  children,
}: {
  // Null while the viewer is not known yet: a placeholder line instead.
  title: string | null;
  // What waits for the viewer (HomeSummary); the app's line until then.
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <PageContainer className="items-center gap-10 py-10 md:py-24 modern:gap-8">
      <header className="flex flex-col items-center gap-3 text-center">
        {title ? (
          <h1 className="font-display text-display-xl text-foreground">
            {title}
          </h1>
        ) : (
          <Skeleton className="h-13 w-72 max-w-full" />
        )}
        <p className="text-body-xl text-[color:var(--text-secondary)]">
          {subtitle ?? fr.shell.home.body}
        </p>
      </header>

      <div className="flex w-full max-w-4xl flex-col gap-10 modern:gap-8">
        <AssistantPanel />
        {children}
      </div>
    </PageContainer>
  );
}
