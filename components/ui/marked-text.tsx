import { Fragment } from "react";

import { markedSegments } from "@/lib/utils/markdown-marks";

/**
 * A text as the model marked it: « **gras** » in bold, « *italique* » in
 * italics, the asterisks never shown (lib/utils/markdown-marks.ts). Inline:
 * it goes inside the element that sets the size and the weight.
 */
export function MarkedText({ text }: { text: string }) {
  return markedSegments(text).map((segment, i) => {
    const words = segment.italic ? <em>{segment.text}</em> : segment.text;
    return segment.bold ? (
      <strong key={i} className="font-bold">
        {words}
      </strong>
    ) : (
      <Fragment key={i}>{words}</Fragment>
    );
  });
}
