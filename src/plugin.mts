import multiline from "./rules/multiline.mjs";
import duplicate from "./rules/duplicate.mjs";
import { loadTailwind, tailwind } from "./load-tailwind.mjs";

export { loadTailwind };

/**
 * This plugin relies on making an asynchronous call to read from the tailwind.css file.
 *
 * @example
 * ```ts
 * import tseslint from "typescript-eslint";
 * import plugin, { loadTailwind } from "@mewhhaha/eslint-plugin-simple-tailwind";
 *
 * const tw = await loadTailwind("./path/to/tailwind.css");
 *
 * export default [plugin(tw).configs.recommended];
 * ```
 */
export const plugin = (tw: tailwind) => {
  const plugin = {
    rules: {
      multiline: multiline,
      duplicate: duplicate,
    },
  } as const;

  const name = "simple-tailwind";

  // Provides autocomplete when defining the plugin rules
  type PluginRules = {
    [key in `${typeof name}/${keyof (typeof plugin)["rules"]}`]:
      | "error"
      | "warn";
  };

  const configs = {
    recommended: {
      files: [
        "**/*.ts",
        "**/*.tsx",
        "**/*.mts",
        "**/*.cts",
        "**/*.js",
        "**/*.jsx",
      ],

      settings: {
        simpletailwindcss: tw,
      },
      plugins: {
        [name]: plugin,
      },
      rules: {
        [`${name}/multiline`]: "warn",
        [`${name}/duplicate`]: "error",
      } satisfies PluginRules,
    },
  } as const;

  return { plugin, configs };
};

export default plugin;
