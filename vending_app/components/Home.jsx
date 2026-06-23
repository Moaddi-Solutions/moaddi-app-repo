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
  TouchableOpacity,
  View,
} from "react-native";
import ProductCard from "~/components/ProductCard";
import { SocialMediaIcons } from "~/components/SocialMediaIcons";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { useSocket } from "~/context/Socket";
import { MoveRight } from "~/lib/icons/MoveRight";
import { grouped } from "~/lib/utils";
import dataProvider from "~/services/dataProvider";

function CategoryCard({ name, description, image, id }) {
  const router = useRouter();
  return (
    <Link href={`/Shop/${id}`}>
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
            onPress={(e) => router.push(`/Shop/${id}`)}
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

const cache = {};
const cards = {
  shops: CategoryCard,
  products: ProductCard,
};

const HomeScreen = () => {
  const { t } = useTranslation();
  const cardGrid = {
    shops: {
      title: t("shops"),
      card: {
        component: "shops",
      },
      queryOptions: {
        limit: 10,
        filter: {
          products: { $ne: [] },
          "products.isActive": true,
        },
      },
    },
    products: {
      title: t("products"),
      card: {
        component: "products",
      },
      queryOptions: {
        limit: 10,
        filter: {
          machines: { $ne: [] },
          "machines.isActive": true,
        },
      },
    },
    specialProducts: {
      title: t("specialProducts"),
      card: {
        component: "products",
      },
      queryOptions: {
        limit: 10,
        filter: {
          isFeatured: true,
          machines: { $ne: [] },
          "machines.isActive": true,
        },
      },
    },
  };
  const [tap, setTap] = useState(cardGrid.shops);
  const [items, setItems] = useState([]);
  const { log } = useSocket();
  useEffect(() => {
    handleTapChange(tap);
    // Appearance.setColorScheme("light");
  }, []);

  const handleTapChange = (tap) => {
    if (cache[tap.title]) {
      setItems(cache[tap.title]);
      setTap(tap);
      return;
    }
    dataProvider
      .getList(`${tap.card.component}Active`, {
        pagination: { page: 1, perPage: 10 },
        ...tap.queryOptions,
      })
      .then(({ data }) => {
        cache[tap.title] = data;
        setItems(cache[tap.title]);
        setTap(tap);
      });
  };

  const Card = cards[tap.card.component];

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
        {/* Categories */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.values(cardGrid).map((card) => (
              <TouchableOpacity
                key={card.title}
                style={styles.categoryCard}
                onPress={() => handleTapChange(card)}
              >
                <Text
                  className={
                    card.title == tap.title
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                  style={styles.categoryName}
                >
                  {card.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="flex gap-4 m-4" style={styles.section}>
          {items
            .filter(({ isActive }) => isActive)
            .map((item, i) => (
              <Card key={i} {...item} />
            ))}
        </View>
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

  const groupedLinks = grouped(links, "category");
  const bodyText = (body ?? "").split("|");

  // console.log({ socialMedia });

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
              source={require("~/assets/images/icon-new.jpg")}
            />
          </View>
          <View>
            <Text className="mt-4 font-bold">{bodyText[0]}</Text>
            <Text>{bodyText[1]}</Text>
            <SocialMediaIcons items={socialMedia} className="z-10 mt-6" />
          </View>

          {/* <View className="flex w-full  justify-around gap-4">
            {groupedLinks.map(([category, links]) => (
              <View
                key={category}
                className="[&_a]:text-secondary-200 [&_a]:hover:text-secondary-300 flex flex-col gap-2"
              >
                <Typography className="mb-2 font-semibold" variant="body2">
                  {category}
                </Typography>
                {links.map(({ title, url, article }, i) => {
                  const { slug } = article ?? {};
                  return (
                    <Link key={i} href={slug || url}>
                      <small>{title}</small>
                    </Link>
                  );
                })}
              </View>
            ))}
          </View> */}
        </View>
      </View>
      <View className={"bg-primary-500 mx-4"}>
        <View className="flex justify-between">
          <Text className="py-1">{title}</Text>
          <View className="[&_a]:text-secondary-50 [&_a]:hover:text-secondary-200 flex flex-wrap gap-4 ">
            {/* {bottomLinks.map(({ title, url }) => (
              <Link key={title} href={url}>
                <Text>{title}</Text>
              </Link>
            ))} */}
          </View>
        </View>
        {/* <Link
          href="https://fortis-team.vercel.app/"
          className="!text-secondary-50 hover:!text-secondary-200 block py-3 text-center"
        >
          <Text>App by Fortis</Text>
        </Link> */}
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

export default HomeScreen;
