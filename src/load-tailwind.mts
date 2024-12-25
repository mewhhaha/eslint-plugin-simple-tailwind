import { __unstable__loadDesignSystem } from "tailwindcss";
import resolve from "enhanced-resolve";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Commonjs module
const { CachedInputFileSystem, ResolverFactory } = resolve;
const fileSystem = new CachedInputFileSystem(fs, 30_000);

export type tailwind = {
  candidatesToCss: (classes: string[]) => (string | null)[];
  getClassOrder: (classList: string[]) => [string, bigint | null][];
};

const cssResolver = ResolverFactory.createResolver({
  fileSystem,
  useSyncFileSystemCalls: true,
  extensions: [".css"],
  mainFields: ["style"],
  conditionNames: ["style"],
});

const esmResolver = ResolverFactory.createResolver({
  fileSystem,
  useSyncFileSystemCalls: true,
  extensions: [".mjs", ".js"],
  mainFields: ["module"],
  conditionNames: ["node", "import"],
});

const cjsResolver = ResolverFactory.createResolver({
  fileSystem,
  useSyncFileSystemCalls: true,
  extensions: [".js", ".cjs"],
  mainFields: ["main"],
  conditionNames: ["node", "require"],
});

export const loadTailwind = async (cssPath: string): Promise<tailwind> => {
  function resolveCssFrom(base: string, id: string) {
    return cssResolver.resolveSync({}, base, id) || id;
  }

  const cssContent = fs.readFileSync(cssPath, "utf-8");

  const design = await __unstable__loadDesignSystem(cssContent, {
    base: cssPath,

    loadModule: createLoader({
      onError: (id, err, resourceType) => {
        console.error(`Unable to load ${resourceType}: ${id}`, err);

        if (resourceType === "config") {
          return {};
        } else if (resourceType === "plugin") {
          return () => {};
        }
      },
    }),
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

const createLoader = <T,>({
  onError,
}: {
  onError: (id: string, error: unknown, resourceType: string) => T;
}) => {
  const cacheKey = `${+Date.now()}`;

  async function loadFile(id: string, base: string, resourceType: string) {
    try {
      const resolved = resolveJsFrom(base, id);

      const url = pathToFileURL(resolved);
      url.searchParams.append("t", cacheKey);

      return await import(url.href).then((m) => m.default ?? m);
    } catch (err) {
      return onError(id, err, resourceType);
    }
  }

  return async (id: string, base: string, resourceType: string) => {
    return {
      base,
      module: await loadFile(id, base, resourceType),
    };
  };
};

const resolveJsFrom = (base: string, id: string): string => {
  try {
    return esmResolver.resolveSync({}, base, id) || id;
  } catch {
    return cjsResolver.resolveSync({}, base, id) || id;
  }
};
