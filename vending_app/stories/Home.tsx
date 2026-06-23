import { StyleSheet, View } from "react-native";
import Hero from "~/app/new-design/Hero";
import HomeScreen from "~/app/new-design/HomeScreen";
import ShopsScreen from "~/app/new-design/ShopsScreen";
import { FeaturedProductsScreen } from "~/stories/components/FeaturedProductsScreen";
import { Footer } from "~/stories/components/Footer";
import { NeuralBackground } from "~/stories/components/NeuralBackground";
import { ProductsScreen } from "~/stories/components/ProductsScreen";

export const Home = () => {
  return (
    <View className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Mobile Container */}
      <View className="bg-white min-h-screen">
        <NeuralBackground />
        <Hero />
        <ShopsScreen />
        <FeaturedProductsScreen />
        <ProductsScreen />
        {/* <ProfileScreen /> */}
        {/* <ContactScreen /> */}
        <Footer />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: 14,
    lineHeight: 24,
    paddingVertical: 48,
    paddingHorizontal: 20,
    marginHorizontal: "auto",
    maxWidth: 600,
    color: "#333",
  },

  h2: {
    fontWeight: "900",
    fontSize: 32,
    lineHeight: 1,
    marginBottom: 4,
  },

  p: {
    marginVertical: 16,
    marginHorizontal: 0,
  },

  a: {
    color: "#1ea7fd",
  },

  ul: {
    paddingLeft: 30,
    marginVertical: 16,
  },

  li: {
    marginBottom: 8,
  },

  tip: {
    alignSelf: "flex-start",
    borderRadius: 16,
    backgroundColor: "#e7fdd8",
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 10,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "700",
    color: "#66bf3c",
  },

  tipWrapper: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 40,
    marginBottom: 40,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  tipWrapperSvg: {
    height: 12,
    width: 12,
    marginRight: 4,
    marginTop: 3,
  },
});
