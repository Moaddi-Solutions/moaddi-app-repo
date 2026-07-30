import chatRepo = require("../data/repos/chat");
import chatSocket = require("./chatSocket");

const sendMessage = async (
  senderId: string,
  conversationId: string,
  input: {
    text: string;
    clientMessageId: string;
  },
) => {
  const result = await chatRepo.sendMessage(senderId, conversationId, input);

  // The transaction has completed successfully before we reach this point.
  if (result.created) {
    try {
      chatSocket.emitNewChatMessage({
        participantIds: result.participantIds,
        senderId,
        message: result.message,
      });
    } catch {
      // A socket problem must not change a successfully saved message
      // into a failed HTTP request.
      console.error("Chat realtime emission failed");
    }
  }

  return result.message;
};

export = {
  sendMessage,
};
