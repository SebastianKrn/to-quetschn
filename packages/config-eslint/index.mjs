import js from "@eslint/js";
import tseslint from "typescript-eslint";

export function createBaseConfig() {
  return [
    {
      ignores: [
        "**/dist/**",
        "**/.next/**",
        "**/coverage/**",
        "**/node_modules/**",
        "**/*.d.ts"
      ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      rules: {
        "no-console": "off"
      }
    }
  ];
}
