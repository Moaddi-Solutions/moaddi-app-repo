import type { Href } from "expo-router";
import ConversationsScreen from "~/components/chat/ConversationsScreen";

/** Messages tab: the shopper's conversation inbox. */
export default function MessagesTab() {
  return (
    <ConversationsScreen
      threadHref={(conversationId) =>
        `/conversations/${conversationId}` as Href
      }
    />
  );
}
