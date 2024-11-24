import tseslint from "typescript-eslint";
import plugin, { loadTailwind } from "./dist/plugin.mjs";

const tw = await loadTailwind("./playground/tailwind.css");

export default tseslint.config(
  ...tseslint.configs.recommended,
  plugin(tw).configs.recommended,
);
