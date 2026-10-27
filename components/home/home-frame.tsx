import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { PageContainer } from "@/components/shell/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

// Frame of the home page (Figma "Desktop - 11"): centred greeting, then one
// column holding the assistant and the cards. Shared by the page and its
// loading state, so PO can be typed into before the cards have arrived.
export function HomeFrame({
  title,
  children,
}: {
  // Null while the viewer is not known yet: a placeholder line instead.
  title: string | null;
  children: React.ReactNode;
}) {
  return (
    <PageContainer className="items-center gap-10 py-10 md:py-20 xl:gap-21 xl:py-33">
      <header className="flex flex-col items-center gap-3 text-center">
        {title ? (
          <h1 className="font-display text-display-xl text-foreground">
            {title}
          </h1>
        ) : (
          <Skeleton className="h-13 w-72 max-w-full" />
        )}
        <p className="text-body-xl text-[color:var(--text-secondary)]">
          {fr.shell.home.body}
        </p>
      </header>

      <div className="flex w-full max-w-4xl flex-col gap-10 md:gap-16">
        <AssistantPanel />
        {children}
      </div>
    </PageContainer>
  );
}
