import { notFound } from "next/navigation";

import { getMeeting } from "@/lib/calls/queries";

// A meeting that does not exist answers a real 404: read before this
// segment's loading.tsx (docs/ARCHITECTURE.md § 3 bis); the page reuses it.
export default async function MeetingLayout({
  children,
  params,
}: LayoutProps<"/app/calls/[callId]">) {
  const { callId } = await params;
  if (!(await getMeeting(callId))) notFound();
  return children;
}
