import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      // Strict TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
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
      "no-throw-literal": "error",
      curly: ["error", "multi-line"],

      // React rules
      "react/jsx-no-target-blank": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // Relax rules for existing engine/agent files (pre-existing code)
    files: ["src/engine/**/*.ts", "src/agent/**/*.ts", "src/ui/**/*.ts", "src/index.ts", "src/server.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];

export default config;
