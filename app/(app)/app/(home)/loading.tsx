import { HomeFeedSkeleton } from "@/components/home/home-feed-skeleton";
import { HomeFrame } from "@/components/home/home-frame";

// Home before the viewer is known: the same frame, PO already usable.
export default function HomeLoading() {
  return (
    <HomeFrame title={null}>
      <HomeFeedSkeleton />
    </HomeFrame>
  );
}
