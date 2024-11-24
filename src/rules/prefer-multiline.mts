import { type RuleModule } from "@typescript-eslint/utils/ts-eslint";
import type { TSESTree } from "@typescript-eslint/utils";
import { invariant } from "../utils/invariant.js";
import {
  hasArguments,
  hasJSXExpressionContainerLiteralValue,
  hasLiteralValue,
  isAttribute,
  isLiteral,
  isNamed,
} from "../utils/is.js";
import { parseSettings } from "../utils/settings.js";

const messages = {
  preferMultiline: "Prefer using template literals for tailwind classes.",
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
      description: "Rule for changing string literals to be template literals.",
    },
  },
  defaultOptions: [],
  create(context) {
    const settings = parseSettings(context);

    const changeToTemplateLiteralExpression = (node: TSESTree.Literal) => {
      context.report({
        node,
        messageId: "preferMultiline",
        fix: (fixer) => {
          return fixer.replaceText(node, `{\`${node.value}\`}`);
        },
      });
    };

    const changeToTemplateLiteral = (node: TSESTree.Literal) => {
      context.report({
        node,
        messageId: "preferMultiline",
        fix: (fixer) => {
          return fixer.replaceText(node, `\`${node.value}\``);
        },
      });
    };

    return {
      JSXAttribute: function (jsxAttribute) {
        try {
          invariant(isAttribute(jsxAttribute, settings.attributes), "ignore");

          if (hasLiteralValue(jsxAttribute)) {
            changeToTemplateLiteralExpression(jsxAttribute.value);
          }

          if (hasJSXExpressionContainerLiteralValue(jsxAttribute)) {
            changeToTemplateLiteral(jsxAttribute.value.expression);
          }
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
            if (isLiteral(arg)) {
              changeToTemplateLiteral(arg);
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

export default rule;
