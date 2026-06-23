import MachinesAndProducts from "@/(root)/(cardsList)/shop/[shopId]/MachinesAndProducts";

const page = async ({ params }) => {
  const { shopId } = await params;

  return <MachinesAndProducts id={shopId} />;
};

export default page;
