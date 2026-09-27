// The URL of one view of a list page: its filters as search params, empty
// ones left out, so the default view is the bare path.
export function viewHref(
  path: string,
  params: Record<string, string | null | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value) query.set(key, value);
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}
