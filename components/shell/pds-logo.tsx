import { cn } from "@/lib/utils";

// The PDS OS monogram (Logo.svg, 30/10/2026), in the current text colour so
// it follows the theme. Decorative: the link or title around it names it.
// Same drawing as app/icon.svg, app/favicon.ico and the PNG icons.
// `entryLanding`: the logo of the page on which the entry splash lands.
export function PdsLogo({
  className,
  entryLanding,
  ref,
}: {
  className?: string;
  entryLanding?: boolean;
  ref?: React.Ref<SVGSVGElement>;
}) {
  return (
    <svg
      ref={ref}
      data-entry-logo={entryLanding ? "" : undefined}
      viewBox="0 0 78 52"
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={cn("h-auto shrink-0", className)}
    >
      <path d="M12.6533 1.5625C16.3999 0.0088248 20.5233 -0.397643 24.501 0.394531C28.4786 1.18678 32.1316 3.14178 34.998 6.01172C36.4976 7.51312 37.7435 9.23132 38.707 11.0967C42.8794 7.30815 48.4203 5 54.5 5C67.4787 5 78 15.5213 78 28.5C78 41.4787 67.4787 52 54.5 52C44.5456 52 36.0372 45.8105 32.6123 37.0703C32.3756 37.2438 32.1363 37.4144 31.8916 37.5781C28.5202 39.8335 24.5559 41.0381 20.5 41.0381V31.0381C22.5753 31.0381 24.6045 30.4216 26.3311 29.2666C28.0577 28.1115 29.4047 26.4687 30.2002 24.5459C30.9955 22.6232 31.2034 20.5073 30.7979 18.4658C30.3923 16.4244 29.3916 14.5497 27.9229 13.0791C26.454 11.6085 24.5825 10.6076 22.5469 10.2021C20.5114 9.79685 18.4012 10.0045 16.4834 10.7998C14.5656 11.5952 12.9259 12.943 11.7715 14.6729C10.617 16.4027 10.0001 18.4369 10 20.5186V52H0V20.5186C6.28907e-05 16.4618 1.20139 12.4952 3.45312 9.12109C5.70496 5.74698 8.90682 3.11624 12.6533 1.5625ZM54.5 15C47.0442 15 41 21.0442 41 28.5C41 35.9558 47.0442 42 54.5 42C61.9558 42 68 35.9558 68 28.5C68 21.0442 61.9558 15 54.5 15Z" />
    </svg>
  );
}
