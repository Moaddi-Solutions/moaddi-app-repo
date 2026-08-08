import type { Href } from "expo-router";
import ConversationsScreen from "~/components/chat/ConversationsScreen";

/** Chat tab: the shopper's conversation inbox. */
export default function ChatTab() {
  return (
    <ConversationsScreen
      threadHref={(conversationId) =>
        `/conversations/${conversationId}` as Href
      }
    />
  );
}
