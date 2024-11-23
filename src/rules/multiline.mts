import {
  RuleContext,
  type RuleModule,
} from "@typescript-eslint/utils/ts-eslint";
import type { TSESTree } from "@typescript-eslint/utils";
import { tailwind } from "../load-tailwind.mjs";

const messages = {
  multilineFormat: "Fix formatting.",
};

const rule = (tw: tailwind): RuleModule<keyof typeof messages, []> => {
  return {
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
      const { callees, attributes, printWidth } = parseSettings(context);

      const multilineWarning = (
        sortedText: string,
        callExpressionArgument: TSESTree.CallExpressionArgument,
      ) => {
        context.report({
          node: callExpressionArgument,
          messageId: "multilineFormat",
          fix: (fixer) => {
            return fixer.replaceText(
              callExpressionArgument,
              `\`${sortedText}\``,
            );
          },
        });
      };

      // Sort the classes using the tw configuration
      const sortClasses = (text: string) => {
        const classes = text.split(/[\s]+/).filter(Boolean);
        const orderedClasses = tw.getClassOrder(classes);

        const sortedClasses = orderedClasses
          .toSorted(([, a], [, b]) => {
            return ascendingBigInt(a, b);
          })
          .map(([c]) => c);

        return sortedClasses;
      };

      return {
        JSXAttribute: function formatMultiline(jsxAttribute) {
          try {
            invariant(isAttribute(jsxAttribute, attributes), "ignore");
            invariant(hasTemplateLiteralExpression(jsxAttribute), "ignore");

            const expression = jsxAttribute.value.expression;
            const quasis = expression.quasis;
            const text = quasis[0].value.raw;
            const indent = " ".repeat(jsxAttribute.loc.start.column);

            const classes = sortClasses(text);

            const nextText = formatText(classes, { indent, printWidth });

            if (text !== nextText) {
              multilineWarning(nextText, expression);
            }
          } catch (error) {
            if (error instanceof Error && error.message === "ignore") {
              return;
            }

            throw error;
          }
        },
        CallExpression: function formatMultilineCallExpression(callExpression) {
          try {
            invariant(isNamed(callExpression, callees), "ignore");
            invariant(hasArguments(callExpression), "ignore");

            const args = callExpression.arguments.filter(isTemplateLiteral);

            for (const arg of args) {
              const quasis = arg.quasis;
              const text = quasis[0].value.raw;
              const indent = " ".repeat(arg.loc.start.column);

              const classes = sortClasses(text);

              const nextText = formatText(classes, { indent, printWidth });

              if (text !== nextText) {
                multilineWarning(nextText, arg);
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
};

const isTemplateLiteral = (
  node: TSESTree.Expression,
): node is TSESTree.TemplateLiteral => {
  return node.type === "TemplateLiteral";
};

const hasArguments = (
  node: TSESTree.CallExpression,
): node is TSESTree.CallExpression & {
  arguments: [TSESTree.Expression, ...TSESTree.Expression[]];
} => {
  return node.arguments.length > 0;
};

const isAttribute = (node: TSESTree.JSXAttribute, attributes: string[]) => {
  return attributes.includes(node.name.name.toString());
};

const hasTemplateLiteralExpression = (
  node: TSESTree.JSXAttribute,
): node is TSESTree.JSXAttribute & {
  value: TSESTree.JSXExpressionContainer & {
    expression: TSESTree.TemplateLiteral;
  };
} => {
  const value = node.value;
  if (!value || value.type !== "JSXExpressionContainer") {
    return false;
  }

  const expression = value.expression;
  if (expression.type !== "TemplateLiteral") {
    return false;
  }

  return true;
};

const isNamed = (node: TSESTree.CallExpression, callees: string[]) => {
  if (
    node.callee.type !== "Identifier" ||
    !callees.includes(node.callee.name)
  ) {
    return false;
  }
  return true;
};

// e.g. "focus:hover:p-4" -> "focus:hover"
const prefix = (className: string) => {
  return className.split(":").slice(0, -1).join(":");
};

const formatText = (
  classes: string[],
  { indent, printWidth }: { indent: string; printWidth: number },
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
        .map((row) => indent + row.join(" "))
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

export function bigSign(bigIntValue: bigint): number {
  return Number(bigIntValue > 0n) - Number(bigIntValue < 0n);
}

function invariant<t>(condition: t, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const parseSettings = <a extends string, b extends []>(
  context: RuleContext<a, b>,
) => {
  const settings = context.settings?.simpleTailwind ?? {};
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

  return { callees, attributes, printWidth };
};
