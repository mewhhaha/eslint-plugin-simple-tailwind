# @mewhhaha/eslint-plugin-simple-tailwind

A simple ESLint plugin for Tailwind CSS.

## Installation

```bash
pnpm add @mewhhaha/eslint-plugin-simple-tailwind
```

## Usage

```mjs
import tseslint from "typescript-eslint";
import plugin, { loadTailwind } from "@mewhhaha/eslint-plugin-simple-tailwind";

const tw = await loadTailwind("./path/to/tailwind.css");

export default [plugin(tw).configs.recommended];
```

## Rules

Here are the rules that are available in this plugin:

### `multiline`

Adds a warning and a code action to format the `className` argument to a predictable style. Applies if it's using a template literal string in attributes `className` or `class` and if the callee is `cn`, `cx`, `className`, `clsx`, or `classNames`. This can be changed in the settings.

- Sorts the classes by the tailwind order.
- Formats the classes to be on multiple lines.
- Breaks the line after the `printWidth` if it's greater than the `printWidth`.
- Removes duplicate classes.

```tsx
// before
<div className={`p-4 focus:p-5 focus:hover:p-6`}></div>

// after
<div className={`
     p-4

     focus:p-5

     hover:p-6
     `}></div>
```

### `duplicate`

Adds an error if the `className` argument has duplicate classes.

## Settings

- `attributes`: The attributes to check for the `className` argument. (default: `["className", "class"]`)
- `callees`: The callees to check for the `className` argument. (default: `["cn", "cx", "className", "clsx", "classNames"]`)
- `printWidth`: The print width to format the `className` argument. (default: 80)

```mjs
export default [
  plugin.configs.recommended,
  {
    settings: {
      simpleTailwind: {
        attributes: ["className", "class"],
        callees: ["cn", "cx", "className", "clsx", "classNames"],
        printWidth: 80,
      },
    },
  },
];
```
