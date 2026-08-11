import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import ChatScreen from "~/app/(root)/screens/ChatScreen";

/** Single conversation thread route: `/Chat/[conversationId]`. */
export default function ChatRoute() {
  const { t } = useTranslation();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  return (
    <>
      <Stack.Screen options={{ title: t("chat") }} />
      <ChatScreen conversationId={conversationId} />
    </>
  );
}
