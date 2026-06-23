import MachineScan from "@/(root)/machine-scan/MachineScan";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const cookieStore = await cookies();
  const user = cookieStore.get("user");
  if (!user) {
    redirect("/signin");
  }
  return <MachineScan />;
};

export default page;
