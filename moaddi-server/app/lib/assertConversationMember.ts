import { repoError } from "./errors";

const assertConversationMember = (
  conversation: { participantIds: string[] },
  userId: string,
) => {
  const isMember = conversation.participantIds.includes(userId);

  if (!isMember) {
    throw repoError(403, "You cannot access this conversation.");
  }
};

export = assertConversationMember;
