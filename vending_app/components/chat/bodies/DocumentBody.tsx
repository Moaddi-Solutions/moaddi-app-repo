import { FileText } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { formatBytes } from "~/components/chat/chatFormat";
import { useChatMediaAuth } from "~/hook/useChatMedia";
import alert from "~/lib/alert";
import { colors, palette, radius, type as typo } from "~/theme/moaddi";
import type { ChatAttachment } from "~/types/chat";

type DocumentBodyProps = {
  conversationId: string;
  messageId?: string;
  attachment?: ChatAttachment;
  mine: boolean;
  /** True while the file is still uploading — opening is not possible yet. */
  pending?: boolean;
};

export function DocumentBody({
  conversationId,
  messageId,
  attachment,
  mine,
  pending,
}: DocumentBodyProps) {
  const { t } = useTranslation();
  const { openDocument } = useChatMediaAuth();
  const [busy, setBusy] = useState(false);

  const foreground = mine ? palette.white : colors.textHeading;
  const muted = mine ? "rgba(255,255,255,0.8)" : colors.textMuted;

  const open = async () => {
    if (pending || !messageId || busy) return;
    setBusy(true);
    try {
      await openDocument(conversationId, messageId, attachment?.name);
    } catch (error: any) {
      console.warn("[chat] document open failed:", error?.message);
      alert("error", t("chatDocumentOpenFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={open}
      disabled={pending}
      accessibilityRole="button"
      accessibilityLabel={attachment?.name || t("chatPreviewDocument")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minWidth: 200,
        maxWidth: 260,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mine ? "rgba(255,255,255,0.2)" : colors.surfaceBrandSoft,
        }}
      >
        {busy ? (
          <ActivityIndicator
            size="small"
            color={mine ? palette.white : palette.teal[600]}
          />
        ) : (
          <FileText size={20} color={mine ? palette.white : palette.teal[600]} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={2}
          style={{ ...typo.bodyStrong, color: foreground }}
        >
          {attachment?.name || t("chatPreviewDocument")}
        </Text>
        <Text style={{ ...typo.caption, color: muted }}>
          {pending ? t("chatUploading") : formatBytes(attachment?.bytes)}
        </Text>
      </View>
    </Pressable>
  );
}

export default DocumentBody;
