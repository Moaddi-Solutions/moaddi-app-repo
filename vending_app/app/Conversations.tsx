import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import ConversationsScreen from "~/app/(root)/screens/ConversationsScreen";

/** Chat inbox route: lists conversations, pushes to `/Chat/[conversationId]` on tap. */
export default function ConversationsRoute() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: t("chat") }} />
      <ConversationsScreen
        navigation={{
          navigate: (_screen: string, params: { conversationId: string }) =>
            router.push(`/Chat/${params.conversationId}` as never),
        }}
      />
    </>
  );
}
