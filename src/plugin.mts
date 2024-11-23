import multiline from "./rules/multiline.mjs";
import duplicate from "./rules/duplicate.mjs";
import { loadTailwind } from "./load-tailwind.mjs";

/**
 * This plugin relies on making an asynchronous call to read from the tailwind.css file.
 *
 * @example
 * ```ts
 * import asyncPlugin from "eslint-plugin-simple-tailwind";
 *
 * const plugin = await asyncPlugin("./path/to/tailwind.css");
 *
 * export default [plugin.configs.recommended]
 * ```
 */
export const asyncPlugin = async (cssPath: string) => {
  const tw = await loadTailwind(cssPath);
  const plugin = {
    files: ["*.ts", "*.tsx", "*.mts", "*.cts"],
    context: {
      tw,
    },
    rules: {
      multiline: multiline(tw),
      duplicate: duplicate(tw),
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

export default asyncPlugin;
