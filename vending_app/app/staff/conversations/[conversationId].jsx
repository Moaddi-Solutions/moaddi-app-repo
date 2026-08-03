import { Stack, useLocalSearchParams } from "expo-router";
import ChatThread from "~/components/chat/ChatThread";

/** Staff-side conversation. Identical to the shopper thread — the chat API
 *  makes no distinction between roles. */
export default function StaffConversationScreen() {
  const { conversationId } = useLocalSearchParams();

  if (!conversationId) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ChatThread conversationId={String(conversationId)} />
    </>
  );
}
