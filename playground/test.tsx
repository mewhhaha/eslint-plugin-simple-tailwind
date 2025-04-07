const cx = (className: string) => {
  console.log(className);
};

<div
  className={`
    bg-gradient-to-br

    group-last:bg-red-500

    peer
  `}
></div>;

<div className={`divide-white border-white`}></div>;

<div className={`flex flex-col gap-2`}></div>;

cx(
  `
    p-4

    focus:bg-red-500 focus:group

    group
  `,
);
