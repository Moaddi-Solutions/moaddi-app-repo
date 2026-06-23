import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Text } from "~/components/ui/text";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View>
        <Text style={styles.text}>This screen doesn't exist.</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  text: {
    margin: 20,
  },
});
