import { Stack, useLocalSearchParams } from "expo-router";
import ChatThread from "~/components/chat/ChatThread";

/** A single conversation, pushed over the tabs. */
export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  if (!conversationId) return null;

  return (
    <>
      {/* ChatThread draws its own safe-area header. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ChatThread conversationId={conversationId} />
    </>
  );
}
