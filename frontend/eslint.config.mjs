import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Existing navigation uses plain anchors in server-rendered pages; keep
      // this delivery feature focused on CI/image validation.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**"]),
]);
