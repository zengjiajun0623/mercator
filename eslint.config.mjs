import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  prettierConfig,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-non-null-assertion": "warn",

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      curly: ["error", "multi-line"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "prefer-template": "warn",
    },
  },
  {
    // Relax rules for existing engine/agent/CLI files
    files: [
      "src/engine/**/*.ts",
      "src/agent/**/*.ts",
      "src/ui/**/*.ts",
      "src/index.ts",
      "src/server.ts",
    ],
    rules: {
      "no-console": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    ignores: ["node_modules/", ".next/", "dist/", "out/"],
  },
);
