import { notFound } from "next/navigation";

import { getVisibleCall } from "@/lib/calls/queries";

// A call that does not exist (or that RLS hides) answers a real 404: read
// before this segment's loading.tsx (docs/ARCHITECTURE.md § 3 bis); the page
// reuses it. Its report (`../report`) stays outside: a member it was shared
// with reads it without seeing the call.
export default async function CallLayout({
  children,
  params,
}: LayoutProps<"/app/calls/[callId]">) {
  const { callId } = await params;
  if (!(await getVisibleCall(callId))) notFound();
  return children;
}
