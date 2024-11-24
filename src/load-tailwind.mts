import { __unstable__loadDesignSystem } from "tailwindcss";
import resolve from "enhanced-resolve";
import fs from "node:fs";
import path from "node:path";

// Commonjs module
const { CachedInputFileSystem, ResolverFactory } = resolve;
const fileSystem = new CachedInputFileSystem(fs, 30_000);

export type tailwind = {
  candidatesToCss: (classes: string[]) => (string | null)[];
  getClassOrder: (classList: string[]) => [string, bigint | null][];
};

export const loadTailwind = async (cssPath: string): Promise<tailwind> => {
  const cssResolver = ResolverFactory.createResolver({
    fileSystem,
    useSyncFileSystemCalls: true,
    extensions: [".css"],
    mainFields: ["style"],
    conditionNames: ["style"],
  });

  function resolveCssFrom(base: string, id: string) {
    return cssResolver.resolveSync({}, base, id) || id;
  }

  const cssContent = fs.readFileSync(cssPath, "utf-8");

  const design = await __unstable__loadDesignSystem(cssContent, {
    base: cssPath,
    loadStylesheet: async (id: string, base: string) => {
      const resolved = resolveCssFrom(base, id);

      return {
        base: path.dirname(resolved),
        content: fs.readFileSync(resolved, "utf-8"),
      };
    },
  });

  // Re-stating these so we can pass the functions around without
  // breaking the lack of "this" context in design
  return {
    getClassOrder: (values) => design.getClassOrder(values),
    candidatesToCss: (values) => design.candidatesToCss(values),
  };
};
