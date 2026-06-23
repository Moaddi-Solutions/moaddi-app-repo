import Machines from "@/(root)/(cardsList)/machines/[productId]/Machines";

const page = async ({ params }) => {
  const { productId } = await params;

  return <Machines id={productId} />;
};

export default page;
