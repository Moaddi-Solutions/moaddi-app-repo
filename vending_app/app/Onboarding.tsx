import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { CreditCard, Globe, PackageOpen, QrCode, ShoppingBag } from "lucide-react-native";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LanguageSelectorModal from "~/components/LanguageSelectorModal";
import { Button } from "~/components/moaddi";
import { ONBOARDING_FLAG } from "~/lib/onboarding";
import { colors, gradients, space, type as typo } from "~/theme/moaddi";

const { width } = Dimensions.get("window");

const ICON_BY_KEY = {
  scan: QrCode,
  pick: ShoppingBag,
  pay: CreditCard,
  grab: PackageOpen,
};

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const slides = [
    { key: "scan", title: t("onboardScanTitle"), body: t("onboardScanBody") },
    { key: "pick", title: t("onboardPickTitle"), body: t("onboardPickBody") },
    { key: "pay", title: t("onboardPayTitle"), body: t("onboardPayBody") },
    { key: "grab", title: t("onboardGrabTitle"), body: t("onboardGrabBody") },
  ];

  const isLast = index === slides.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_FLAG, "1");
    router.replace("/(tabs)");
  };

  const next = () => {
    if (isLast) return finish();
    const nextIndex = index + 1;
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setIndex(nextIndex);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Language + Skip */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space.gutter,
          paddingTop: 8,
        }}
      >
        <Pressable
          onPress={() => setLanguageModalVisible(true)}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Globe size={20} color={colors.textMuted} strokeWidth={1.8} />
          <Text style={{ ...typo.bodyStrong, color: colors.textMuted }}>
            {t("language")}
          </Text>
        </Pressable>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={{ ...typo.bodyStrong, color: colors.textMuted }}>{t("skip")}</Text>
        </Pressable>
      </View>

      <LanguageSelectorModal
        isModalVisible={languageModalVisible}
        setModalVisible={setLanguageModalVisible}
      />

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => {
          const Icon = ICON_BY_KEY[item.key as keyof typeof ICON_BY_KEY];
          return (
            <View
              style={{
                width,
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 32,
                gap: 28,
              }}
            >
              <LinearGradient
                colors={gradients.brandHero}
                style={{
                  width: 148,
                  height: 148,
                  borderRadius: 74,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={64} color="#fff" strokeWidth={1.6} />
              </LinearGradient>
              <View style={{ gap: 12, alignItems: "center" }}>
                <Text style={{ ...typo.title1, color: colors.textHeading, textAlign: "center" }}>
                  {item.title}
                </Text>
                <Text style={{ ...typo.body, color: colors.textMuted, textAlign: "center" }}>
                  {item.body}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Dots */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          paddingBottom: 24,
        }}
      >
        {slides.map((s, i) => (
          <View
            key={s.key}
            style={{
              height: 8,
              width: i === index ? 22 : 8,
              borderRadius: 4,
              backgroundColor: i === index ? colors.textBrand : colors.borderStrong,
            }}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: space.gutter, paddingBottom: 16 }}>
        <Button fullWidth onPress={next}>
          {isLast ? t("getStarted") : t("next")}
        </Button>
      </View>
    </SafeAreaView>
  );
}
