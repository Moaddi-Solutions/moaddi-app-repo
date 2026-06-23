import { ScrollView } from "react-native";
import Hero from "~/app/new-design/Hero";
import ShopsScreen from "~/app/new-design/ShopsScreen";
import { ProductsScreen } from "~/stories/components/ProductsScreen";

function HomeScreen() {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Hero />
      <ShopsScreen />
      <ProductsScreen />
    </ScrollView>
  );
}

export default HomeScreen;
