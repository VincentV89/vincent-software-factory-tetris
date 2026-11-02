import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "cdk.out/", "infra/"] },
  js.configs.recommended,
  { files: ["web/**/*.js"], languageOptions: { globals: globals.browser } },
  { files: ["test/**/*.js"], languageOptions: { globals: globals.node } },
];
