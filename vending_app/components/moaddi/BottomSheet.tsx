import { X } from "lucide-react-native";
import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import Modal from "react-native-modal";
import { colors, radius, shadow, space, type as typo } from "~/theme/moaddi";

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
}

export function BottomSheet({ isVisible, onClose, title, children }: BottomSheetProps) {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={["down"]}
      style={{ justifyContent: "flex-end", margin: 0 }}
      backdropOpacity={0.4}
      propagateSwipe
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            backgroundColor: colors.surfaceCard,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: 32,
            ...shadow.raised,
          }}
        >
        {/* Drag handle */}
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
          <View
            style={{
              width: 36,
              height: 4,
              backgroundColor: colors.borderStrong,
              borderRadius: 2,
            }}
          />
        </View>

        {/* Header */}
        {title ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: space.gutter,
              paddingBottom: 16,
            }}
          >
            <Text style={{ ...typo.title3, color: colors.textHeading }}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.surfaceSunken,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default BottomSheet;
