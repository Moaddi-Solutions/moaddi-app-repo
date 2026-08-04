import ConversationsScreen from "@/(root)/components/chat/ConversationsScreen";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ConversationsScreen selectedConversationId={conversationId} />;
}
