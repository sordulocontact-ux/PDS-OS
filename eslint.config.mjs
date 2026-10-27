import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The whole French dictionary (921 KB) must never reach the browser: a
  // component imports only the domains it reads (lib/i18n/fr/<domain>.ts)
  // and builds its local `fr` (page loads audit, docs/ARCHITECTURE.md
  // § 3 bis). Server code elsewhere may still import it whole.
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/i18n/fr",
              importNames: ["fr"],
              allowTypeImports: true,
              message:
                "Import the domains this file reads from @/lib/i18n/fr/<domain> (the whole dictionary is 921 KB in the browser).",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone prototypes, their sources and Node test scripts: not app code.
    "docs/protos/**",
  ]),
]);

export default eslintConfig;
