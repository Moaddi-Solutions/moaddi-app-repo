import * as DocumentPicker from "expo-document-picker";
import {
  ImageManipulator,
  SaveFormat,
} from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Camera, FileText, Image as ImageIcon, MapPin } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { BottomSheet } from "~/components/moaddi";
import alert from "~/lib/alert";
import { ensurePermission } from "~/lib/permissions";
import {
  ACCEPTED_DOCUMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
} from "~/services/chatApi";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";
import type { ChatLocation, LocalFile } from "~/types/chat";

/**
 * Longest edge, in pixels, an outgoing photo is resized to.
 *
 * Combined with JPEG quality 0.7 this keeps a photo comfortably inside the
 * server's 5 MB image cap while staying sharp on a phone screen.
 */
const MAX_IMAGE_EDGE = 1600;

/**
 * Normalizes a picked photo to something the server will accept.
 *
 * Two problems this solves, both of which produce a confusing 415 or 413 at
 * upload time if skipped:
 *   1. iOS hands back HEIC, which the server's content sniffer rejects — it
 *      accepts only PNG, JPEG and WebP.
 *   2. A modern phone photo is routinely 4-8 MB, over the 5 MB cap.
 * Re-encoding to JPEG fixes both, and returns the true dimensions for the
 * bubble's aspect ratio.
 */
const normalizeImage = async (uri: string): Promise<LocalFile & {
  width: number;
  height: number;
}> => {
  const rendered = await ImageManipulator.manipulate(uri)
    .resize({ width: MAX_IMAGE_EDGE })
    .renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
  });

  return {
    uri: result.uri,
    name: `photo-${Date.now()}.jpg`,
    mimeType: "image/jpeg",
    width: result.width,
    height: result.height,
  };
};

export type AttachmentPick =
  | {
      kind: "image";
      file: LocalFile;
      width: number;
      height: number;
    }
  | { kind: "document"; file: LocalFile }
  | { kind: "location"; location: ChatLocation };

type AttachMenuProps = {
  isVisible: boolean;
  onClose: () => void;
  onPick: (pick: AttachmentPick) => void;
};

export function AttachMenu({ isVisible, onClose, onPick }: AttachMenuProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);

  const finish = (pick: AttachmentPick) => {
    setBusy(null);
    onClose();
    onPick(pick);
  };

  const pickImage = async (fromCamera: boolean) => {
    setBusy(fromCamera ? "camera" : "gallery");
    try {
      const allowed = await ensurePermission({
        request: () =>
          fromCamera
            ? ImagePicker.requestCameraPermissionsAsync()
            : ImagePicker.requestMediaLibraryPermissionsAsync(),
        deniedMessage: t("chatPermissionDenied"),
        blockedMessage: fromCamera
          ? t("chatCameraPermissionBlocked")
          : t("chatGalleryPermissionBlocked"),
      });
      if (!allowed) {
        setBusy(null);
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });

      if (result.canceled || !result.assets?.length) {
        setBusy(null);
        return;
      }

      const normalized = await normalizeImage(result.assets[0].uri);
      finish({
        kind: "image",
        file: normalized,
        width: normalized.width,
        height: normalized.height,
      });
    } catch (error: any) {
      console.warn("[chat] image pick failed:", error?.message);
      alert("error", t("chatAttachmentFailed"));
      setBusy(null);
    }
  };

  const pickDocument = async () => {
    setBusy("document");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_DOCUMENT_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) {
        setBusy(null);
        return;
      }

      const asset = result.assets[0];
      // Checked here as well as on the server so the user is told before a
      // 10 MB upload is attempted over mobile data.
      if ((asset.size ?? 0) > MAX_ATTACHMENT_BYTES.document) {
        alert("error", t("chatFileTooLarge"));
        setBusy(null);
        return;
      }

      finish({
        kind: "document",
        file: {
          uri: asset.uri,
          name: asset.name || "document",
          mimeType: asset.mimeType || "application/octet-stream",
          size: asset.size ?? undefined,
        },
      });
    } catch (error: any) {
      console.warn("[chat] document pick failed:", error?.message);
      alert("error", t("chatAttachmentFailed"));
      setBusy(null);
    }
  };

  const shareLocation = async () => {
    setBusy("location");
    try {
      const allowed = await ensurePermission({
        request: () => Location.requestForegroundPermissionsAsync(),
        deniedMessage: t("chatLocationPermissionDenied"),
        blockedMessage: t("chatLocationPermissionBlocked"),
      });
      if (!allowed) {
        setBusy(null);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      finish({
        kind: "location",
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy ?? undefined,
        },
      });
    } catch (error: any) {
      console.warn("[chat] location failed:", error?.message);
      alert("error", t("chatLocationFailed"));
      setBusy(null);
    }
  };

  const options = [
    {
      id: "camera",
      label: t("chatAttachCamera"),
      icon: Camera,
      onPress: () => pickImage(true),
    },
    {
      id: "gallery",
      label: t("chatAttachGallery"),
      icon: ImageIcon,
      onPress: () => pickImage(false),
    },
    {
      id: "document",
      label: t("chatAttachDocument"),
      icon: FileText,
      onPress: pickDocument,
    },
    {
      id: "location",
      label: t("chatAttachLocation"),
      icon: MapPin,
      onPress: shareLocation,
    },
  ];

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={() => {
        setBusy(null);
        onClose();
      }}
      title={t("chatAttach")}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          paddingHorizontal: space.gutter,
          gap: 12,
        }}
      >
        {options.map((option) => {
          const Icon = option.icon;
          const loading = busy === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={option.onPress}
              disabled={Boolean(busy)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              style={{
                width: "47%",
                alignItems: "center",
                gap: 8,
                paddingVertical: 18,
                borderRadius: radius.lg,
                backgroundColor: colors.surfaceSunken,
                opacity: busy && !loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={palette.teal[500]} />
              ) : (
                <Icon size={24} color={palette.teal[600]} />
              )}
              <Text style={{ ...typo.caption, color: colors.textBody }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

export default AttachMenu;
