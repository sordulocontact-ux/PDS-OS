import { SegmentedLinks } from "@/components/ui/segmented-control";

// Views of one list as a segmented bar whose choice lives in the URL
// (?view=…): shareable, and the back button works.
export function ViewToggle({
  label,
  options,
}: {
  label: string;
  options: Array<{ href: string; label: string; current: boolean }>;
}) {
  return <SegmentedLinks label={label} options={options} />;
}
