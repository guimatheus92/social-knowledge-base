import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // react-hooks v6 (React Compiler) flags every setState inside an effect.
      // Our remaining cases are the SSR-safe pattern of initializing client-only
      // state (localStorage / window.location) once after mount — these *must*
      // run in an effect to avoid a hydration mismatch and cannot be lazy-init'd.
      // Keep it as a visible warning (not a hard error) rather than scattering
      // disable comments. The correctness-oriented rules (refs, purity) stay errors.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
