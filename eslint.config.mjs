import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

const config = [
  js.configs.recommended,
  prettierConfig,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off", // handled by TS rule above
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      curly: ["error", "multi-line"],
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-duplicate-case": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-return-await": "error",
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
    },
  },
  {
    ignores: ["node_modules/", ".next/", "dist/", "out/"],
  },
];

export default config;
