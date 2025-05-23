import { type RuleModule } from "@typescript-eslint/utils/ts-eslint";
import { type TSESTree } from "@typescript-eslint/utils";
import { parseSettings } from "../utils/settings.js";
import { invariant } from "../utils/invariant.js";
import {
  hasArguments,
  hasTemplateLiteralExpression,
  isAttribute,
  isNamed,
  isTemplateLiteral,
} from "../utils/is.js";
import { parseUtility } from "../utils/parse.js";

const messages = {
  unknownClass: "Unknown class '{{className}}'",
};

const rule: RuleModule<keyof typeof messages, []> = {
  meta: {
    messages,
    type: "problem",
    schema: [],
    docs: {
      description:
        "Rule for ensuring that there are no duplicate Tailwind utility classes with the same base.",
    },
  },
  defaultOptions: [],
  create(context) {
    const settings = parseSettings(context);

    const reportUnknown = (
      expression: TSESTree.TemplateLiteral,
      text: string,
      unknown: string,
    ) => {
      const lines = text.split("\n");

      const lineWithUnknown = lines.findIndex((line) => line.includes(unknown));

      let columnOfUnknown = lines[lineWithUnknown].indexOf(unknown);

      if (lines.length === 1) {
        // If it's just one line, we need to add the column offset since the indentation is not included in the loc
        columnOfUnknown = expression.loc.start.column + 1 + columnOfUnknown;
      }

      context.report({
        node: expression,
        loc: {
          start: {
            line: expression.loc.start.line + lineWithUnknown,
            column: columnOfUnknown,
          },
          end: {
            line: expression.loc.start.line + lineWithUnknown,
            column: columnOfUnknown + unknown.length,
          },
        },
        messageId: "unknownClass",
        data: {
          className: unknown,
        },
      });
    };

    const checkUnknowns = (expression: TSESTree.TemplateLiteral) => {
      const quasis = expression.quasis;
      const text = quasis[0].value.raw;

      const duplicates = findUnknowns(text, settings.candidatesToCss);
      for (const duplicate of duplicates) {
        reportUnknown(expression, text, duplicate);
      }
    };

    return {
      JSXAttribute: function (jsxAttribute) {
        try {
          invariant(isAttribute(jsxAttribute, settings.attributes), "ignore");
          invariant(hasTemplateLiteralExpression(jsxAttribute), "ignore");

          const expression = jsxAttribute.value.expression;
          checkUnknowns(expression);
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
              checkUnknowns(arg);
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

// group and peer don't generate css, just used for nesting
const whitelisted = ["group", "peer"];

const findUnknowns = (
  text: string,
  candidatesToCss: (classes: string[]) => (string | null)[],
) => {
  const unknowns = new Set<string>();
  // Split into individual classes
  const classes = text.split(/\s+/).filter(Boolean);

  const css = candidatesToCss(classes);

  for (let i = 0; i < classes.length; i++) {
    const className = classes[i];
    const definition = css[i];

    const utility = parseUtility(className);
    if (whitelisted.some((c) => utility === c || utility.startsWith(`${c}/`))) {
      continue;
    }

    if (definition === null) {
      unknowns.add(className);
    }
  }

  return unknowns;
};

export default rule;
