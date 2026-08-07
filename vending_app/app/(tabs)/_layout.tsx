import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { MoaddiTabBar } from "~/components/navigation/MoaddiTabBar";

/**
 * Primary app shell: bottom tabs (Home / Shops / Chat / Profile) rendered with the
 * moaddi design-system BottomNav. `(tabs)` is a URL-transparent route group,
 * so `/` still resolves to the Home tab and existing deep links are unaffected.
 * Other screens (Shop/[id], Checkout, …) push over the tabs from the parent Stack.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <MoaddiTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: t("home") }} />
      <Tabs.Screen name="shops" options={{ title: t("shops") }} />
      <Tabs.Screen name="chat" options={{ title: t("chat") }} />
      <Tabs.Screen name="profile" options={{ title: t("profile") }} />
    </Tabs>
  );
}
