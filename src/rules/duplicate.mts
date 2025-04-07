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
import { parsePrefix, parseUtility } from "../utils/parse.js";

const messages = {
  duplicateClass:
    "Duplicate Tailwind class '{{className}}' found. Other occurrence: '{{original}}'",
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

    const reportDuplicate = (
      expression: TSESTree.TemplateLiteral,
      text: string,
      duplicate: `${string} ${string}`,
    ) => {
      const [className, original] = duplicate.split(" ");

      const lines = text.split("\n");

      const lineWithDuplicate = lines.findIndex((line) =>
        line.includes(className),
      );

      let columnOfDuplicate = lines[lineWithDuplicate].indexOf(className);

      if (lines.length === 1) {
        // If it's just one line, we need to add the column offset since the indentation is not included in the loc
        columnOfDuplicate = expression.loc.start.column + 1 + columnOfDuplicate;
      }

      context.report({
        node: expression,
        loc: {
          start: {
            line: expression.loc.start.line + lineWithDuplicate,
            column: columnOfDuplicate,
          },
          end: {
            line: expression.loc.start.line + lineWithDuplicate,
            column: columnOfDuplicate + className.length,
          },
        },
        messageId: "duplicateClass",
        data: {
          className,
          original,
        },
      });
    };

    const checkDuplicates = (expression: TSESTree.TemplateLiteral) => {
      const quasis = expression.quasis;
      const text = quasis[0].value.raw;

      const duplicates = findDuplicates(text, settings.candidatesToCss);
      for (const duplicate of duplicates) {
        reportDuplicate(expression, text, duplicate);
      }
    };

    return {
      JSXAttribute: function (jsxAttribute) {
        try {
          invariant(isAttribute(jsxAttribute, settings.attributes), "ignore");
          invariant(hasTemplateLiteralExpression(jsxAttribute), "ignore");

          const expression = jsxAttribute.value.expression;
          checkDuplicates(expression);
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
              checkDuplicates(arg);
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

const findDuplicates = (
  text: string,
  candidatesToCss: (classes: string[]) => (string | null)[],
) => {
  const duplicates = new Set<`${string} ${string}`>();
  // Split into individual classes
  const classes = text.split(/\s+/).filter(Boolean);

  // Track seen base utilities
  const seenClasses = new Map<string, string>();

  const css = candidatesToCss(classes.map(parseUtility));

  for (let i = 0; i < classes.length; i++) {
    const className = classes[i];
    const definition = css[i];
    if (!definition) {
      continue;
    }

    // focus:hover:p-4
    const prefix = parsePrefix(className);

    // Gets all the css keys that are being applied, and that's how we decide if something is "overlapping"
    // { padding: 1rem } => ["padding"]
    let matches = definition?.matchAll(/([\\w-]+):/g);
    // ["padding"] => "padding"
    const keys = [...matches].map((m) => m[1]).join(" ");

    // { 
    //  :where(& > :not(:last-child)) { 
    //  } 
    // } => ["where(& > :not(:last-child)) {"]
    matches = definition?.matchAll(/^\s*:(.*)\s*{\s*$/gm);

    const selectors = [...matches].map((m) => m[1]).join(" ");

    // Just a unique identifier for the class based on its prefix, css keys, and the first pseudo-selector line
    // e.g. "border-color", "divide-color :where(& > :not(:last-child))", "focus:hover padding"
    const hash = [prefix, selectors, keys].filter(Boolean).join(" ");
    const duplicate = seenClasses.get(hash);
    if (duplicate) {
      duplicates.add(`${className} ${duplicate}`);
    } else {
      seenClasses.set(hash, className);
    }
  }

  return duplicates;
};

export default rule;
