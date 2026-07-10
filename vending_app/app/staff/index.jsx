import { useRouter } from "expo-router";
import { House, LayoutDashboard } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "~/components/moaddi";
import { Dashboard } from "~/components/staff/Dashboard";
import HomeScreen from "~/components/staff/Home";
import { getItem } from "~/lib/utils";
import { colors, palette } from "~/theme/moaddi";

const TABS = [
  {
    id: "home",
    label: "Home",
    icon: (active) => (
      <House size={20} color={active ? palette.teal[500] : palette.ink[500]} />
    ),
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (active) => (
      <LayoutDashboard size={20} color={active ? palette.teal[500] : palette.ink[500]} />
    ),
  },
];

export default function Screen() {
  const router = useRouter();
  const [tab, setTab] = useState("home");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getItem("user").then((user) => {
      if (user) return;
      router.replace("/Signin");
    });
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <View style={{ flex: 1 }}>
        {tab === "home" ? <HomeScreen /> : <Dashboard />}
      </View>
      <View
        style={{
          backgroundColor: colors.surfaceCard,
          paddingBottom: insets.bottom,
        }}
      >
        <BottomNav items={TABS} activeId={tab} onSelect={setTab} />
      </View>
    </View>
  );
}
