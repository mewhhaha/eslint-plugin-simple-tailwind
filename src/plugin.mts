import formatting from "./rules/formatting.mjs";
import duplicate from "./rules/duplicate.mjs";
import unknown from "./rules/unknown.mjs";
import { loadTailwind, type tailwind } from "./load-tailwind.mjs";
import preferMultiline from "./rules/prefer-multiline.mjs";

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
      formatting: formatting,
      duplicate: duplicate,
      unknown: unknown,
      "prefer-multiline": preferMultiline,
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
        [`${name}/formatting`]: "warn",
        [`${name}/duplicate`]: "error",
        [`${name}/unknown`]: "warn",
        [`${name}/prefer-multiline`]: "warn",
      } satisfies PluginRules,
    },
  } as const;

  return { plugin, configs };
};

export default plugin;
