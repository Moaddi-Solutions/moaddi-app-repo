import { X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { useChatMediaAuth } from "~/hook/useChatMedia";
import { colors, palette, radius, type as typo } from "~/theme/moaddi";
import type { ChatAttachment } from "~/types/chat";

const MAX_WIDTH = 240;
const MAX_HEIGHT = 320;

/** Fits the image inside the bubble while preserving its aspect ratio. */
const fit = (attachment?: ChatAttachment) => {
  const width = attachment?.width;
  const height = attachment?.height;
  if (!width || !height) return { width: MAX_WIDTH, height: 180 };

  const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

type ImageBodyProps = {
  conversationId: string;
  messageId?: string;
  attachment?: ChatAttachment;
  /** Set while the upload is still in flight — renders the picked file. */
  localUri?: string;
};

export function ImageBody({
  conversationId,
  messageId,
  attachment,
  localUri,
}: ImageBodyProps) {
  const { t } = useTranslation();
  const { mediaSource } = useChatMediaAuth();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);

  const size = fit(attachment);
  const source = localUri
    ? { uri: localUri }
    : messageId
      ? mediaSource(conversationId, messageId)
      : null;

  if (!source) return null;

  if (failed) {
    return (
      <View
        style={{
          ...size,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceSunken,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ ...typo.caption, color: colors.textMuted }}>
          {t("chatImageUnavailable")}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => !localUri && setViewerOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={t("chatPreviewImage")}
      >
        <View
          style={{
            ...size,
            borderRadius: radius.md,
            overflow: "hidden",
            backgroundColor: colors.surfaceSunken,
          }}
        >
          <Image
            source={source}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
          {loading ? (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator color={palette.teal[400]} />
            </View>
          ) : null}
        </View>
      </Pressable>

      <Modal
        isVisible={viewerOpen}
        onBackdropPress={() => setViewerOpen(false)}
        onBackButtonPress={() => setViewerOpen(false)}
        style={{ margin: 0 }}
        backdropOpacity={0.95}
      >
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Image
            source={source}
            style={{ width: "100%", height: "80%" }}
            resizeMode="contain"
          />
          <Pressable
            onPress={() => setViewerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            style={{
              position: "absolute",
              top: 48,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <X size={22} color={palette.white} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

export default ImageBody;
