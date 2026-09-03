import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import LanguageSelectorModal from "~/components/LanguageSelectorModal";
import { SocialLinks } from "~/components/moaddi";
import { colors } from "~/theme/moaddi";
import { HeroHeader } from "./home/HeroHeader";
import { ProductsSection } from "./home/ProductsSection";
import { ServiceGrid } from "./home/ServiceGrid";
import { NotificationBanner } from "./home/NotificationBanner";
import { ShopsList } from "./home/ShopsList";
import { SpecialProducts } from "./home/SpecialProducts";

/**
 * Moaddi Home — V1 (gradient hero + service grid), redesigned per the
 * Claude Design "Moaddi App Redesign". Composes the moaddi design-system
 * primitives with live shop/product data.
 */
function HomeScreen() {
  const router = useRouter();
  const [langModalVisible, setLangModalVisible] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      
      <LanguageSelectorModal
        isModalVisible={langModalVisible}
        setModalVisible={setLangModalVisible}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <HeroHeader
          onLanguage={() => setLangModalVisible(true)}
          onSearch={() => router.push("/Search" as never)}
        />
        <ServiceGrid
          onScan={() => router.push("/MachineQRScan" as never)}
          onShops={() => router.push("/(tabs)/shops" as never)}
          onProducts={() => router.push("/Products" as never)}
          onOrders={() => router.push("/PurchaseHistory" as never)}
        />
        <NotificationBanner />
        <ShopsList />
        <SpecialProducts />
        <ProductsSection />
        <SocialLinks />
      </ScrollView>
    </View>
  );
}

export default HomeScreen;
