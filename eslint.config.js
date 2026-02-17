import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default [
  {
    ignores: ["dist", "node_modules"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["warn", "double", { "avoidEscape": true }],
      semi: ["warn", "never"],
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    }
  }
]
