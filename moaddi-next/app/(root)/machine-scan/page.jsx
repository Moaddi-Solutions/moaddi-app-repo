import MachineScan from "@/(root)/machine-scan/MachineScan";

// Open to everyone — guests and signed-in shoppers alike. The guest-vs-sign-in
// choice is deferred to the purchase step on machine-products/group-products,
// which pops `GuestCheckoutDialog` (same pattern as checkout).
const page = () => {
  return <MachineScan />;
};

export default page;
