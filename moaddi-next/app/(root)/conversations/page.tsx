import ConversationsScreen from "@/(root)/components/chat/ConversationsScreen";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <ConversationsScreen
      openPendingContact={query.open === "contact"}
    />
  );
}
