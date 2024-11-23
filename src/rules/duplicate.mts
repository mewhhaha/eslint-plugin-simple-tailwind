import { type RuleModule } from "@typescript-eslint/utils/ts-eslint";
import { type TSESTree } from "@typescript-eslint/utils";
import { tailwind } from "../load-tailwind.mjs";

const messages = {
  duplicateClass:
    "Duplicate Tailwind class '{{className}}' found. Other occurrence: '{{original}}'",
};

const rule = (tw: tailwind): RuleModule<keyof typeof messages, []> => {
  return {
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
      const reportDuplicate = (
        expression: TSESTree.TemplateLiteral,
        text: string,
        duplicate: `${string} ${string}`,
      ) => {
        const [a, b] = duplicate.split(" ");
        context.report({
          node: expression,
          loc: {
            start: {
              line: expression.loc.start.line,
              column: text.indexOf(a),
            },
            end: {
              line: expression.loc.start.line,
              column: text.indexOf(a) + a.length,
            },
          },
          messageId: "duplicateClass",
          data: {
            className: a,
            original: b,
          },
        });
      };

      return {
        JSXAttribute: function checkDuplicates(callExpression) {
          if (callExpression.name.name !== "className") {
            return;
          }
          const value = callExpression.value;
          if (!value || value.type !== "JSXExpressionContainer") {
            return;
          }

          const expression = value.expression;
          if (expression.type !== "TemplateLiteral") {
            return;
          }
          const text = expression.quasis[0].value.raw;

          const duplicates = findDuplicates(text, tw.candidatesToCss);
          for (const duplicate of duplicates) {
            reportDuplicate(expression, text, duplicate);
          }
        },
      };
    },
  };
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
    const matches = definition?.matchAll(/([\w-]+):/g);
    // ["padding"] => "padding"

    const keys = [...matches].map((m) => m[1]).join(" ");

    // Just a unique identifier for the class based on its prefix and the css keys that are being applied
    // "focus:hover padding"
    const hash = prefix + " " + keys;
    const duplicate = seenClasses.get(hash);
    if (duplicate) {
      duplicates.add(`${className} ${duplicate}`);
    } else {
      seenClasses.set(hash, className);
    }
  }

  return duplicates;
};

// focus:hover:p-4 => "p-4"
const parseUtility = (className: string) => {
  // focus:hover:p-4

  // ["focus", "hover", "p-4"]
  const split = className.split(":");

  // ["focus", "hover", "p-4"] => "p-4"
  const utility = split.slice(-1)[0];

  // "p-4" => { padding: 1rem; }
  return utility;
};

// focus:hover:p-4 => "focus:hover"
const parsePrefix = (className: string) => {
  const split = className.split(":");
  return split.slice(0, -1).join(":");
};

export default rule;
