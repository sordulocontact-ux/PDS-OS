import Link from "next/link";

// Link to another view of the same page (a project section, an artist tab,
// a step of the breadcrumb, a list filter): prefetched in full, data
// included, as soon as it is on screen, so switching views shows the
// content at once instead of a loading state. Kept fresh by
// experimental.staleTimes.static (next.config.ts) and emptied by every
// revalidatePath (docs/ARCHITECTURE.md § 3 bis). Production only: `next dev`
// never prefetches.
export function ViewLink(props: React.ComponentProps<typeof Link>) {
  return <Link prefetch {...props} />;
}
