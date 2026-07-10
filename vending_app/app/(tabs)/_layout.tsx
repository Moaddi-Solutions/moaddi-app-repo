import { Tabs } from "expo-router";
import { MoaddiTabBar } from "~/components/navigation/MoaddiTabBar";

/**
 * Primary app shell: bottom tabs (Home / Shops / Profile) rendered with the
 * moaddi design-system BottomNav. `(tabs)` is a URL-transparent route group,
 * so `/` still resolves to the Home tab and existing deep links are unaffected.
 * Other screens (Shop/[id], Checkout, …) push over the tabs from the parent Stack.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <MoaddiTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="shops" options={{ title: "Shops" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
