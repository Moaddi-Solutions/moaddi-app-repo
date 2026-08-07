import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useChatContext } from '~/app/(root)/context/ChatContext';
import {
  useContactTarget,
  type ContactKind,
} from '~/app/(root)/context/ContactTargetContext';
import { useUser } from '~/context/UserContext';
import alert from '~/lib/alert';

/**
 * Resolves "who does Contact talk to here" and opens that conversation.
 *
 * Shared by the header button and the bottom-nav chat slot so the two can never
 * disagree about the target. Mirrors the web client's ContactChatButton.
 */

const LABEL_KEYS: Record<ContactKind, string> = {
  support: 'contactSupport',
  'machine-vendor': 'messageVendor',
  'shop-owner': 'messageShopOwner',
  vendor: 'messageVendor',
};

const normalizeId = (value: unknown) => {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
};

export function useOpenContactChat({
  targetUserId,
  kind,
}: {
  targetUserId?: string | null;
  kind?: ContactKind;
} = {}) {
  const contextualTarget = useContactTarget();
  const { totalUnreadCount, openConversation } = useChatContext();
  const { user } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const [isOpening, setIsOpening] = useState(false);

  const resolvedKind = kind ?? contextualTarget.kind;
  const resolvedTargetId =
    targetUserId === undefined ? contextualTarget.targetUserId : normalizeId(targetUserId);
  const targetPending = targetUserId === undefined ? Boolean(contextualTarget.isPending) : false;

  const currentUserId = normalizeId(user?._id);
  /** Never offer to message yourself (e.g. a vendor viewing their own machine). */
  const isOwnContact = Boolean(currentUserId) && currentUserId === resolvedTargetId;

  const isDisabled = isOpening || targetPending;

  const open = useCallback(async () => {
    if (isDisabled) return;

    if (!user) {
      alert('info', t('signInRequired'));
      router.push('/Signin' as never);
      return;
    }

    if (!resolvedTargetId) {
      alert('error', t('contactUnavailable'));
      return;
    }

    setIsOpening(true);
    try {
      const conversationId = await openConversation(resolvedTargetId);
      router.push(`/Chat/${conversationId}` as never);
    } catch (error) {
      console.error('[chat] open conversation failed', error);
      alert('error', t('contactUnavailable'));
    } finally {
      setIsOpening(false);
    }
  }, [isDisabled, openConversation, resolvedTargetId, router, t, user]);

  return {
    open,
    label: t(LABEL_KEYS[resolvedKind]),
    isOpening,
    isDisabled,
    isOwnContact,
    unreadCount: Number.isFinite(totalUnreadCount) ? Math.max(0, totalUnreadCount) : 0,
  };
}
