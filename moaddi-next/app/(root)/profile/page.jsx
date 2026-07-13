import SettingsPage from "@/(root)/components/profile/settings-page";
import { isShopperRole } from "@/../lib/dashboard-role";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
  if (!userCookie) redirect("/signin");
  const user = JSON.parse(userCookie.value);
  if (!isShopperRole(user.role)) redirect("/admin");
  const preferredCurrency = user?.preferredCurrency;

  return <SettingsPage preferredCurrency={preferredCurrency} />;
};

export default page;
