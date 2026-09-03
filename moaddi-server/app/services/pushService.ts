import axios from "axios";

/**
 * Delivery to Expo's push relay.
 *
 * The app registers with FCM/APNs through `expo-notifications` and gets back one
 * normalized Expo token, so this server never holds FCM or APNs credentials and
 * never speaks either protocol — it posts to a single endpoint and Expo fans out
 * to the right native service. (The FCM V1 service-account key uploaded via
 * `eas credentials` is what authorizes *Expo* to talk to Google on our behalf.)
 *
 * Deliberately no `expo-server-sdk`: sending is this one HTTP call.
 *
 * This module knows only how to talk to Expo. Who to notify and what the text
 * says belongs to the caller, which keeps it reusable for any future non-chat
 * push (order status, promos) without modification.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Expo rejects a request carrying more than 100 messages. */
const CHUNK_SIZE = 100;

/**
 * Never let a stalled relay hold a request open. Nothing awaits this service on
 * a user-facing path today (chatService fires it and forgets), but an unbounded
 * socket is still a slow resource leak under load.
 */
const REQUEST_TIMEOUT_MS = 10_000;

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** iOS app-icon badge. Android launcher badges come from the channel, not here. */
  badge?: number;
  /** Must match a channel the app created, or Android downgrades the priority. */
  channelId?: string;
  sound?: "default";
  /**
   * "high" asks FCM/APNs to deliver immediately instead of batching. Without it
   * Android may hold a message until the device leaves Doze, which for a chat
   * reads as a notification that arrived minutes late.
   */
  priority?: "default" | "high";
}

/**
 * What `/push/send` returns per message — a *ticket*, not a delivery receipt.
 * A ticket says Expo accepted (or immediately rejected) the message; actual
 * delivery is confirmed later via the separate `/push/getReceipts` endpoint.
 * `DeviceNotRegistered` does surface here for already-known-dead tokens, which
 * is what makes cheap pruning possible without polling receipts.
 */
interface PushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Sends every message and returns each token paired with its ticket, so the
 * caller can act on per-token failures (chiefly `DeviceNotRegistered`).
 *
 * Never throws: a push is an enhancement, and every caller so far is a
 * best-effort side effect of an already-committed write. A failed chunk yields
 * no tickets for its tokens rather than aborting the remaining chunks.
 */
const sendPushMessages = async (
  messages: PushMessage[],
): Promise<Array<{ token: string; ticket: PushTicket }>> => {
  const results: Array<{ token: string; ticket: PushTicket }> = [];

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    try {
      const response = await axios.post(EXPO_PUSH_URL, chunk, {
        headers: { "Content-Type": "application/json" },
        timeout: REQUEST_TIMEOUT_MS,
      });

      // Tickets come back positionally, one per message in the chunk.
      const tickets: PushTicket[] = response.data?.data ?? [];
      tickets.forEach((ticket, index) => {
        const message = chunk[index];
        if (message) results.push({ token: message.to, ticket });
      });
    } catch (error) {
      console.error("Expo push send failed:", error);
    }
  }

  return results;
};

/** Tokens Expo says will never deliver again — safe to delete. */
const deadTokensFrom = (
  results: Array<{ token: string; ticket: PushTicket }>,
): string[] =>
  results
    .filter(
      ({ ticket }) =>
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered",
    )
    .map(({ token }) => token);

export = { sendPushMessages, deadTokensFrom };
