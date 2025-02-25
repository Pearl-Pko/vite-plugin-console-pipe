import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Add Prettier plugin and config
    plugins: {
      prettier,
    },
    rules: {
      // Enable Prettier rules
      "prettier/prettier": "error",
    },
    
  },
  eslintConfigPrettier, // Disable conflicting ESLint rules
];