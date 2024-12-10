import { type RuleModule } from "@typescript-eslint/utils/ts-eslint";
import type { TSESTree } from "@typescript-eslint/utils";
import { invariant } from "../utils/invariant.js";
import {
  hasArguments,
  hasTemplateLiteralExpression,
  isAttribute,
  isNamed,
  isTemplateLiteral,
} from "../utils/is.js";
import { parseSettings } from "../utils/settings.js";

const messages = {
  multilineFormat: "Fix formatting.",
};

const rule: RuleModule<keyof typeof messages, []> = {
  meta: {
    fixable: "code",
    messages,
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          app: {
            type: "string",
          },
        },
      },
    ],
    docs: {
      description:
        "Rule for ensuring that the tailwind classes are formatted. They should follow a certain print width, be correctly indented, sorted from the tailwind configuration and have a newline separating any unique prefixes.",
    },
  },
  defaultOptions: [],
  create(context) {
    const settings = parseSettings(context);

    const multilineWarning = (
      sortedText: string,
      callExpressionArgument: TSESTree.CallExpressionArgument,
    ) => {
      context.report({
        node: callExpressionArgument,
        messageId: "multilineFormat",
        fix: (fixer) => {
          return fixer.replaceText(callExpressionArgument, `\`${sortedText}\``);
        },
      });
    };

    // Sort the classes using the tw configuration
    const sortClasses = (text: string) => {
      const classes = text.split(/[\s]+/).filter(Boolean);
      const orderedClasses = settings.getClassOrder(classes);

      const sortedClasses = orderedClasses
        .toSorted(([, a], [, b]) => {
          return ascendingBigInt(a, b);
        })
        .map(([c]) => c);

      return sortedClasses;
    };

    const checkFormatting = (
      arg: TSESTree.TemplateLiteral,
      align?: TSESTree.JSXAttribute,
    ) => {
      const quasis = arg.quasis;
      const text = quasis[0].value.raw;
      const indent = " ".repeat(
        align ? align.loc.start.column : arg.loc.start.column,
      );

      const classes = sortClasses(text);
      const nextText = formatText(classes, {
        indent,
        printWidth: settings.printWidth,
        extraIndentation: " ".repeat(settings.extraIndentation),
      });

      if (text !== nextText) {
        multilineWarning(nextText, arg);
      }
    };

    return {
      JSXAttribute: function (jsxAttribute) {
        try {
          invariant(isAttribute(jsxAttribute, settings.attributes), "ignore");
          invariant(hasTemplateLiteralExpression(jsxAttribute), "ignore");

          checkFormatting(jsxAttribute.value.expression, jsxAttribute);
        } catch (error) {
          if (error instanceof Error && error.message === "ignore") {
            return;
          }

          throw error;
        }
      },
      CallExpression: function (callExpression) {
        try {
          invariant(isNamed(callExpression, settings.callees), "ignore");
          invariant(hasArguments(callExpression), "ignore");

          for (const arg of callExpression.arguments) {
            if (isTemplateLiteral(arg)) {
              checkFormatting(arg);
            }
          }
        } catch (error) {
          if (error instanceof Error && error.message === "ignore") {
            return;
          }

          throw error;
        }
      },
    };
  },
};

// e.g. "focus:hover:p-4" -> "focus:hover"
const prefix = (className: string) => {
  return className.split(":").slice(0, -1).join(":");
};

const formatText = (
  classes: string[],
  {
    indent,
    printWidth,
    extraIndentation,
  }: { indent: string; printWidth: number; extraIndentation: string },
) => {
  /**
   * Group the classes by their prefix
   * `p-4 m-4 focus:p-4 group` -> `[["p-4", "m-4"], ["focus:p-4"], ["group"]]`
   */
  const groupedClasses = groupBy(classes, (a, b) => {
    return prefix(a) === prefix(b);
  });

  /**
   * `p-4
   *
   * focus:p-4
   *
   * group`
   */
  const textClasses = groupedClasses
    .map((classes) => {
      return splitByPrintWidth(classes, printWidth - indent.length)
        .map((row) => extraIndentation + indent + row.join(" "))
        .join("\n");
    })
    .join("\n\n");

  if (!textClasses.includes("\n")) {
    // Just bail if it's a single string: e.g. "flex m-4 p-4"
    return textClasses.trim();
  }

  /**
   * Format the start and the end to align the classes
   * `
   * p-4
   *
   * focus:p-4
   *
   * group
   * `
   */
  const nextText = `\n${textClasses}\n${indent}`;
  return nextText;
};

const ascendingBigInt = (a: bigint | null, b: bigint | null) => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return bigSign(a - b);
};

const groupBy = <t,>(array: t[], isSameGroup: (a: t, b: t) => boolean) => {
  const groups: t[][] = [];
  for (const item of array) {
    const lastItem = groups.at(-1)?.at(-1);
    if (lastItem && isSameGroup(item, lastItem)) {
      groups.at(-1)?.push(item);
      continue;
    }

    groups.push([item]);
  }

  return groups;
};

const splitByPrintWidth = (classes: string[], printWidth: number) => {
  let currentLength = 0;
  const row: string[][] = [[]];
  for (const className of classes) {
    if (row.at(-1)?.length === 0) {
      row.at(-1)?.push(className);
      continue;
    }

    if (currentLength + className.length > printWidth) {
      row.push([]);
      currentLength = 0;
    }

    row.at(-1)?.push(className);
    currentLength += className.length;
  }

  return row;
};

export default rule;

const bigSign = (bigIntValue: bigint): number => {
  return Number(bigIntValue > 0n) - Number(bigIntValue < 0n);
};
