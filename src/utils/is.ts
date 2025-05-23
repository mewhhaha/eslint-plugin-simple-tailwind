import { type TSESTree } from "@typescript-eslint/utils";

export const isTemplateLiteral = (
  node: TSESTree.Expression,
): node is TSESTree.TemplateLiteral => {
  return node.type === "TemplateLiteral";
};

export const isLiteral = (
  node: TSESTree.Expression,
): node is TSESTree.Literal => {
  return node.type === "Literal";
};

export const hasArguments = (
  node: TSESTree.CallExpression,
): node is TSESTree.CallExpression & {
  arguments: [TSESTree.Expression, ...TSESTree.Expression[]];
} => {
  return node.arguments.length > 0;
};

export const isAttribute = (
  node: TSESTree.JSXAttribute,
  attributes: string[],
) => {
  return attributes.includes(node.name.name.toString());
};

export const hasTemplateLiteralExpression = (
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

export const hasLiteralValue = (
  node: TSESTree.JSXAttribute,
): node is TSESTree.JSXAttribute & {
  value: TSESTree.StringLiteral;
} => {
  return node.value?.type === "Literal";
};

export const hasJSXExpressionContainerLiteralValue = (
  node: TSESTree.JSXAttribute,
): node is TSESTree.JSXAttribute & {
  value: TSESTree.JSXExpressionContainer & {
    expression: TSESTree.Literal;
  };
} => {
  return (
    node.value?.type === "JSXExpressionContainer" &&
    node.value.expression.type === "Literal"
  );
};

export const isNamed = (node: TSESTree.CallExpression, callees: string[]) => {
  if (
    node.callee.type !== "Identifier" ||
    !callees.includes(node.callee.name)
  ) {
    return false;
  }
  return true;
};
