import Admin from "@/(admin)/components/Admin";
import { isCustomerRole, isDashboardRole } from "@/../lib/dashboard-role";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const cookieStore = await cookies();
  const user = cookieStore.get("user");

  if (user) {
    try {
      const { role: rawRole } = JSON.parse(user.value);
      if (isCustomerRole(rawRole)) redirect("/");
      if (!isDashboardRole(rawRole)) redirect("/");
    } catch {
      /* malformed cookie — let react-admin login replace it */
    }
  }

  // No cookie (or staff session): render dashboard; react-admin shows #/login when needed.
  return <Admin />;
}
