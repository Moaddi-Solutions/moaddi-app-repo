import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import MachineCard from "~/components/MachineCard";
import { SocialLinks } from "~/components/moaddi";
import { useManyReference } from "~/hook/useManyReference";

export default function Machines() {
  const { productId } = useLocalSearchParams();
  const { isPending, items } = useManyReference("machines", {
    target: "productId",
    id: productId,
  });

  return (
    <ScrollView className="my-6 px-6 flex-1 " contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}>
      {!isPending && (
        <View className="my-3 gap-4">
          {items
            ?.filter(({ isActive }) => isActive)
            .map((machine) => (
              <MachineCard key={machine._id} {...machine} />
            ))}
        </View>
      )}
      <SocialLinks />
    </ScrollView>
  );
}

const styles = StyleSheet.create({});
