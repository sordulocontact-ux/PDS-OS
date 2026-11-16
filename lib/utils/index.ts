import { createCn } from "cn/config";

// The text sizes of the theme (`--text-*` in app/globals.css @theme), named
// to the class merger as sizes: unknown, `text-caption` was taken for a
// colour and dropped whenever a `text-[color:…]` followed it in one `cn()`
// (found 15/11/2026: the Finance figures lost their size). A size added to
// the theme is added here.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display-lg",
            "display-md",
            "display-sm",
            "display-module",
            "figure-xl",
            "figure-lg",
            "figure-md",
            "body-xl",
            "body-lg",
            "body-md",
            "body-sm",
            "caption",
            "colhead",
            "eyebrow",
            "micro",
          ],
        },
      ],
    },
  },
});
