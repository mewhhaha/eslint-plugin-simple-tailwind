import tseslint from "typescript-eslint";
import plugin, { loadTailwind } from "./dist/plugin.mjs";

const tw = await loadTailwind("./path/to/tailwind.css");

export default tseslint.config(
  ...tseslint.configs.recommended,
  plugin(tw).configs.recommended,
);
