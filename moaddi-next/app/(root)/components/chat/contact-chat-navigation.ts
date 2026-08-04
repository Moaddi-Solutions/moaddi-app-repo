import type { ContactKind } from "@/(root)/context/contact-target-context";

const PENDING_CONTACT_KEY = "chat:pending-contact";
const MAX_PENDING_AGE_MS = 5 * 60 * 1000;

export type PendingContact = {
  targetUserId: string;
  kind: ContactKind;
  requestedAt: number;
};

const CONTACT_KINDS = new Set<ContactKind>([
  "support",
  "machine-vendor",
  "shop-owner",
  "vendor",
]);

export function savePendingContact(
  target: Omit<PendingContact, "requestedAt">,
) {
  try {
    sessionStorage.setItem(
      PENDING_CONTACT_KEY,
      JSON.stringify({ ...target, requestedAt: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function readPendingContact(): PendingContact | null {
  try {
    const parsed = JSON.parse(
      sessionStorage.getItem(PENDING_CONTACT_KEY) || "null",
    ) as Partial<PendingContact> | null;
    const valid =
      parsed &&
      typeof parsed.targetUserId === "string" &&
      parsed.targetUserId.trim() &&
      typeof parsed.kind === "string" &&
      CONTACT_KINDS.has(parsed.kind as ContactKind) &&
      typeof parsed.requestedAt === "number" &&
      Date.now() - parsed.requestedAt <= MAX_PENDING_AGE_MS;

    if (!valid) {
      clearPendingContact();
      return null;
    }

    return {
      targetUserId: parsed.targetUserId!.trim(),
      kind: parsed.kind as ContactKind,
      requestedAt: parsed.requestedAt!,
    };
  } catch {
    clearPendingContact();
    return null;
  }
}

export function clearPendingContact() {
  try {
    sessionStorage.removeItem(PENDING_CONTACT_KEY);
  } catch {
    // Navigation still works; there is simply no persisted pending target.
  }
}
