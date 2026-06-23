// screens/HomeScreen.tsx
import { Link, useRouter } from "expo-router";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import { useManyReference } from "~/hook/useManyReference";
import { MoveRight } from "~/lib/icons/MoveRight";
import { getItem } from "~/lib/utils";
import dataProvider from "~/services/dataProvider";

function CategoryCard({ name, description, image, _id: id }) {
  const router = useRouter();

  return (
    <Link href={`/staff/shop/${id}`}>
      <Card className="relative rounded-xl border p-0 w-full">
        <Image
          source={{ uri: image.src }}
          alt={name}
          resizeMode="cover"
          width="400"
          height="200"
          className="absolute h-full w-full rounded-xl "
        />
        <View className="h-full gap-1 p-3 ">
          <Text className="text-white text-xl font-semibold">{name}</Text>
          <Text className="text-white text-xs ">{description}</Text>
          <Button
            onPress={(e) => router.push(`/staff/shop/${id}`)}
            variant={"outline"}
            className="text-white mt-3 h-6 w-1/4 rounded-full bg-white/30 border-white"
          >
            <MoveRight className="rtl:-scale-x-[1] color-white" />
          </Button>
        </View>
      </Card>
    </Link>
  );
}

const Init = () => {
  const { user } = useUser();
  const router = useRouter();
  useEffect(() => {
    getItem("user").then((user) => {
      if (user) return;
      setTimeout(() => {
        router.replace("/Signin");
      }, 500);
    });
  }, [user]);
  return user && <HomeScreen />;
};

const HomeScreen = () => {
  const { user } = useUser();
  const { items, isPending } = useManyReference("shops", {
    target: "vendorId",
    id: user._id,
  });

  const { log } = useSocket();
  async function onFetchUpdateAsync() {
    try {
      const update = await Updates.checkForUpdateAsync();
      log(JSON.stringify(update));
    } catch (error) {
      log(`Error fetching latest Expo update: ${error}`);
    }
  }

  useEffect(() => {
    onFetchUpdateAsync();
  }, []);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView className="mt-5" showsVerticalScrollIndicator={false}>
        {!isPending && (
          <View className="flex gap-4 m-4" s>
            {items
              ?.filter(({ isActive }) => isActive)
              .map((item, i) => (
                <CategoryCard key={i} {...item} />
              ))}
          </View>
        )}
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
};

const Footer = () => {
  const [footer, setFooter] = useState();
  const { i18n } = useTranslation();
  useEffect(() => {
    Promise.all([
      dataProvider.getOne(`${i18n.language}FooterBody`, {}),
      dataProvider.getOne(`site`, {}),
    ]).then(([footerData, socialMediaData]) =>
      setFooter({
        ...footerData.data,
        ...socialMediaData.data,
      }),
    );
  }, [i18n.language]);
  if (!footer) return;
  const { body, title, links, bottomLinks, socialMedia } = footer;

  return (
    <View className="bg-primary-800 text-primary-100 [&_a]:transition-all">
      <View className="flex flex-col items-center justify-center pt-8">
        <View className="flex items-center gap-4 mx-4">
          <View className="flex justify-center items-center">
            <Image
              resizeMode="contain"
              className="h-20"
              width={15}
              height={15}
              source={require("~/assets/images/logo-white.jpg")}
            />
          </View>
        </View>
      </View>
      <View className={"bg-primary-500 mx-4"}>
        <View className="flex justify-between">
          <Text className="py-1">{title}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryCard: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 20,
  },
  categoryName: {
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
  },
});

export default Init;
