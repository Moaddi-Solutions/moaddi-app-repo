import { Bell } from "lucide-react-native";
import { Text, View } from "react-native";
import { useNotification } from "~/context/NotificationContext";
import { colors, radius, shadow, space } from "~/theme/moaddi";

/** Shows the most recently received push while the app is foregrounded. */
export function NotificationBanner() {
  const { notification, expoPushToken } = useNotification();
  console.log(notification, expoPushToken, "expoPushToken");

  return (
    <>
      {/* ponytail: dev-only token readout, delete once Steps 1-3/7 auto-register the token */}
      {expoPushToken ? (
        <View
          style={{
            marginTop: space.gutter,
            marginHorizontal: space.gutter,
            backgroundColor: colors.surfaceCard,
            borderRadius: radius.lg,
            padding: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.textBody }}>
            Expo push token (dev):
          </Text>
          <Text selectable style={{ fontSize: 12, color: colors.textHeading }}>
            {expoPushToken}
          </Text>
        </View>
      ) : null}
      {notification &&
      (notification.request.content.title ||
        notification.request.content.body) ? (
        <View
          style={{
            marginTop: space.gutter,
            marginHorizontal: space.gutter,
            backgroundColor: colors.surfaceCard,
            borderRadius: radius.lg,
            padding: 16,
            flexDirection: "row",
            gap: 12,
            alignItems: "flex-start",
            ...shadow.card,
          }}
        >
          <Bell size={20} color={colors.textBrand} />
          <View style={{ flex: 1 }}>
            {notification.request.content.title ? (
              <Text style={{ fontWeight: "600", color: colors.textHeading }}>
                {notification.request.content.title}
              </Text>
            ) : null}
            {notification.request.content.body ? (
              <Text style={{ color: colors.textBody, marginTop: 2 }}>
                {notification.request.content.body}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </>
  );
}

export default NotificationBanner;
