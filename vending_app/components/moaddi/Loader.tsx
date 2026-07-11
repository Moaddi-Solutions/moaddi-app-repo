import { ActivityIndicator, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native";
import { colors, type as typo } from "~/theme/moaddi";

interface LoaderProps {
  message?: string;
  /** Fills available space (flex: 1) — use for full-screen / page-level loaders */
  flex?: boolean;
  style?: ViewStyle;
}

export function Loader({ message, flex, style }: LoaderProps) {
  return (
    <View style={[styles.container, flex && styles.flex, style]}>
      <ActivityIndicator size="large" color={colors.interactivePrimary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  flex: {
    flex: 1,
  },
  message: {
    ...(typo.body as object),
    color: colors.textMuted,
    marginTop: 12,
  },
});
