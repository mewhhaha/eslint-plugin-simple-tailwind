const cx = (className: string) => {
  console.log(className);
};

cx(`
   rounded-md bg-red-500 p-4 text-white

   focus:bg-red-600
   `);
