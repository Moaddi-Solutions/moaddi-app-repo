import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Globe, Search, UserRound } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "~/components/moaddi";
import { TopBar } from "~/components/moaddi/TopBar";
import { useUser } from "~/context/UserContext";
import { colors, gradients, radius, space, type } from "~/theme/moaddi";

interface HeroHeaderProps {
  title?: string;
  subtitle?: string;
  onLanguage?: () => void;
  onSearch?: () => void;
}

/**
 * Brand gradient header: logo + greeting + language toggle, with a search
 * pill. Bottom padding leaves room for the ServiceGrid card to overlap.
 */
export function HeroHeader({
  title,
  subtitle,
  onLanguage,
  onSearch,
}: HeroHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  return (
    <LinearGradient
      colors={gradients.brandHero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + 4, paddingBottom: 56 }}
    >
      <TopBar
        brand
        style={{ backgroundColor: "transparent" }}
        title={title ?? t("goodEvening")}
        subtitle={subtitle ?? t("scanPayGrabIt")}
        leading={
          <Image
            source={require("~/assets/images/icon-new.jpg")}
            style={{ width: 40, height: 40, borderRadius: 12 }}
          />
        }
        trailing={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!user ? (
              <IconButton
                label={t("login")}
                onPress={() => router.push("/Profile" as never)}
                icon={<UserRound size={20} color={colors.textOnBrand} />}
              />
            ) : null}
            <IconButton
              label={t("language")}
              onPress={onLanguage}
              icon={<Globe size={20} color={colors.textOnBrand} />}
            />
          </View>
        }
      />

      {/* Search pill */}
      <Pressable
        onPress={onSearch}
        style={{
          marginHorizontal: space.gutter,
          marginTop: 6,
          height: 44,
          borderRadius: radius.pill,
          backgroundColor: "rgba(255,255,255,0.18)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.35)",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
        }}
      >
        <Search size={18} color="rgba(255,255,255,0.9)" />
        <Text style={{ ...type.body, color: "rgba(255,255,255,0.9)" }}>
          {t("searchProducts")}
        </Text>
      </Pressable>
    </LinearGradient>
  );
}

export default HeroHeader;
