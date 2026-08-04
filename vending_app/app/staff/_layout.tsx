import { Redirect } from "expo-router";
import StaffStacks from "~/components/staff/Stacks";
import { useAbility } from "~/context/AbilityContext";
import { useUser } from "~/context/UserContext";

export default function StacksLayout() {
  const { user, isLoading } = useUser();
  const { isStaff } = useAbility();

  // Wait for the stored session (and its rules) before deciding.
  if (isLoading) return null;
  if (!user) return <Redirect href="/Signin" />;
  // Rules still backfilling for a pre-CASL session: render nothing yet
  // rather than bouncing a legitimate staff user out.
  if (!Array.isArray(user.rules)) return null;
  if (!isStaff) return <Redirect href="/" />;

  return <StaffStacks />;
}
