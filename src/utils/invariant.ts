export function invariant<t>(condition: t, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
