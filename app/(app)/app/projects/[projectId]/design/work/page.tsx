import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** The old direct work (`?d=<cible>&q=<sujet>`): its target in the
 * Intentions step. */
export default async function DesignWorkPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/design/work">) {
  const { projectId } = await params;
  const target = first((await searchParams).d);
  redirect(routes.projectDesignWork(projectId, target));
}
