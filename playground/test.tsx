const cx = (className: string) => {
  console.log(className);
};

<div
  className={`
    bg-gradient-to-r

    group-last:bg-red-500

    peer
  `}
></div>;
cx(
  `
    p-4

    focus:bg-red-500 focus:group

    group
  `,
);
