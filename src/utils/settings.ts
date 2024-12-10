import { RuleContext } from "@typescript-eslint/utils/ts-eslint";
import { invariant } from "./invariant.js";

export const parseSettings = <a extends string, b extends []>(
  context: RuleContext<a, b>,
) => {
  const settings = context.settings?.simpletailwindcss ?? {};
  invariant(
    typeof settings === "object" && settings !== null,
    "settings must be an object",
  );
  let callees = ["cn", "cx", "className", "clsx", "classNames"];
  if ("callees" in settings && Array.isArray(settings.callees)) {
    invariant(
      settings.callees.every((a) => typeof a === "string"),
      "callees must be an array of strings",
    );
    callees = settings.callees;
  }

  let attributes = ["className", "class"];
  if ("attributes" in settings && Array.isArray(settings.attributes)) {
    invariant(
      settings.attributes.every((a) => typeof a === "string"),
      "attributes must be an array of strings",
    );
    attributes = settings.attributes;
  }

  let printWidth = 80;
  if ("printWidth" in settings && typeof settings.printWidth === "number") {
    printWidth = settings.printWidth;
  }

  let extraIndentation = 2;
  if (
    "extraIndentation" in settings &&
    typeof settings.extraIndentation === "number"
  ) {
    extraIndentation = settings.extraIndentation;
  }

  let candidatesToCss = null;
  if (
    "candidatesToCss" in settings &&
    typeof settings.candidatesToCss === "function"
  ) {
    candidatesToCss = settings.candidatesToCss as (
      values: string[],
    ) => (string | null)[];
  }
  invariant(
    candidatesToCss,
    "missing the candidatesToCss function in simpleTailwind settings",
  );

  let getClassOrder = null;
  if (
    "getClassOrder" in settings &&
    typeof settings.getClassOrder === "function"
  ) {
    getClassOrder = settings.getClassOrder as (
      values: string[],
    ) => [string, bigint | null][];
  }
  invariant(
    getClassOrder,
    "missing the getClassOrder function in simpleTailwind settings",
  );

  return {
    callees,
    attributes,
    printWidth,
    getClassOrder,
    candidatesToCss,
    extraIndentation,
  };
};
