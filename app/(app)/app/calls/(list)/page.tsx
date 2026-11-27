import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { viewHref } from "@/lib/ui/view-href";
import { asCalendarMode, asDay } from "@/lib/utils/calendar-period";
import { filterValues } from "@/lib/ui/filter-options";

/**
 * The old Calls page, now two: its calendar (?display=calendar, week by
 * default) is the Calendrier, its list is Notes (Sacha, 27/11/2026). Kept for
 * the links and bookmarks that still point here; the pages of a call
 * (/app/calls/<id>) stay where they are.
 */
export default async function CallsRedirect({
  searchParams,
}: PageProps<"/app/calls">) {
  const params = await searchParams;
  if (params.display === "calendar") {
    const mode = asCalendarMode(params.mode, "week");
    redirect(
      viewHref(routes.calendar, {
        mode: mode === "month" ? null : mode,
        date: asDay(params.date),
      }),
    );
  }
  redirect(
    viewHref(routes.notes, {
      project: filterValues(params.project).join(",") || null,
    }),
  );
}
