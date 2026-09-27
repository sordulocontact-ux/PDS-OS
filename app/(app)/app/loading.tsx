import { PageLoading } from "@/components/shell/page-loading";

// Any page without a loading state of its own (Travail, a master, a form,
// the first render of a project or an artist): the frame shows at once.
export default function AppLoading() {
  return <PageLoading />;
}
