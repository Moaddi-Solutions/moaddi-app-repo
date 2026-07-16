import { useRouter } from "expo-router";
import * as Updates from "expo-updates";
import { Store } from "lucide-react-native";
import React, { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { ShopCard, SocialLinks } from "~/components/moaddi";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import { useManyReference } from "~/hook/useManyReference";
import { getItem } from "~/lib/utils";
import { colors, palette, space } from "~/theme/moaddi";

const Init = () => {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    getItem("user").then((u) => {
      if (u) return;
      setTimeout(() => router.replace("/Signin"), 500);
    });
  }, [user]);

  return user ? <HomeScreen /> : null;
};

const HomeScreen = () => {
  const { user } = useUser();
  const router = useRouter();
  const { items, isPending } = useManyReference("shops", {
    target: "vendorId",
    id: user._id,
  });
  const { log } = useSocket();

  useEffect(() => {
    Updates.checkForUpdateAsync()
      .then((update) => log(JSON.stringify(update)))
      .catch((error) => log(`Error fetching update: ${error}`));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, gap: 12, paddingTop: 16 }}
      >
        {!isPending &&
          items
            ?.filter(({ isActive }) => isActive)
            .map((item) => (
              <ShopCard
                key={item._id}
                name={item.name}
                description={item.description}
                icon={<Store size={24} color={palette.teal[500]} />}
                live={false}
                onPress={() => router.push(`/staff/shop/${item._id}`)}
              />
            ))}
        <SocialLinks />
      </ScrollView>
    </View>
  );
};

export default Init;
