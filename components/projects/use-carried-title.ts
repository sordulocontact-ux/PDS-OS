"use client";

import { usePathname, useSearchParams } from "next/navigation";

import {
  carriedTitleOf,
  type CarriedTitle,
} from "@/lib/projects/title-carry-rules";

/** The collective's title the page shows, for the project's navigation to
 * open the other workflows worked by title on it (title-carry-rules.ts);
 * null for any other project. */
export function useCarriedTitle(
  projectId: string,
  collective: boolean,
): CarriedTitle | null {
  const pathname = usePathname();
  const params = useSearchParams();
  return collective ? carriedTitleOf(projectId, pathname, params) : null;
}
