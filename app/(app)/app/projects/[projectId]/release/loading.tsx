import { fr } from "@/lib/i18n/fr";

export default function Loading() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <span className="sr-only" role="status">
        {fr.release.states.loading}
      </span>
      <div className="grid gap-2">
        <div className="h-6 w-32 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="h-96 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="h-64 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </div>
    </div>
  );
}
