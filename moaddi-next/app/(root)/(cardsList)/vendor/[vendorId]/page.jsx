import Products from "@/(root)/(cardsList)/vendor/[vendorId]/Products";

const page = async ({ params }) => {
  const { vendorId } = await params;

  return <Products id={vendorId} />;
};

export default page;
