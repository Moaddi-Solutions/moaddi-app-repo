import { Reply } from "lucide-react-native";
import { ReactNode, useMemo, useRef } from "react";
import { Animated, I18nManager, PanResponder, View } from "react-native";
import { colors, palette } from "~/theme/moaddi";

/** How far the bubble must travel before releasing counts as a reply. */
const TRIGGER_DISTANCE = 56;
const MAX_DISTANCE = 80;

/**
 * Drag a bubble sideways to reply to it.
 *
 * Built on `PanResponder` (React Native core) rather than
 * `react-native-gesture-handler`, which is not a dependency of this app —
 * adding it would mean a new native module and reconfiguring the navigator for
 * no benefit at this scale.
 *
 * The responder only claims clearly-horizontal gestures, so vertical scrolling
 * in the message list still wins.
 */
export function SwipeToReply({
  children,
  onReply,
  enabled = true,
}: {
  children: ReactNode;
  onReply: () => void;
  enabled?: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const triggered = useRef(false);

  // Swipe inward: rightward on LTR, leftward on RTL.
  const direction = I18nManager.isRTL ? -1 : 1;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => {
          if (!enabled) return false;
          const horizontal = gesture.dx * direction;
          return horizontal > 12 && Math.abs(gesture.dy) < Math.abs(gesture.dx);
        },
        onPanResponderGrant: () => {
          triggered.current = false;
        },
        onPanResponderMove: (_event, gesture) => {
          const horizontal = Math.max(0, gesture.dx * direction);
          translateX.setValue(
            Math.min(horizontal, MAX_DISTANCE) * direction,
          );
          if (!triggered.current && horizontal >= TRIGGER_DISTANCE) {
            triggered.current = true;
          }
        },
        onPanResponderRelease: () => {
          if (triggered.current) onReply();
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [enabled, direction, translateX, onReply],
  );

  const iconOpacity = translateX.interpolate({
    inputRange: direction > 0 ? [0, TRIGGER_DISTANCE] : [-TRIGGER_DISTANCE, 0],
    outputRange: direction > 0 ? [0, 1] : [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [direction > 0 ? "left" : "right"]: 12,
          justifyContent: "center",
          opacity: iconOpacity,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surfaceSunken,
          }}
        >
          <Reply size={15} color={palette.teal[600]} />
        </View>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export default SwipeToReply;
