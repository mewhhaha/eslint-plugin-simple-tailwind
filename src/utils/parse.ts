// focus:hover:p-4 => "p-4"
export const parseUtility = (className: string) => {
  // focus:hover:p-4

  // ["focus", "hover", "p-4"]
  const split = className.split(":");

  // ["focus", "hover", "p-4"] => "p-4"
  const utility = split.slice(-1)[0];

  // "p-4" => { padding: 1rem; }
  return utility;
};

// focus:hover:p-4 => "focus:hover"
export const parsePrefix = (className: string) => {
  const split = className.split(":");
  return split.slice(0, -1).join(":");
};
