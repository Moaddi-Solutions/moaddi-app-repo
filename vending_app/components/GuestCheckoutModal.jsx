import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { BottomSheet, Button, Loader } from "~/components/moaddi";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { saveGuestInfo, startGuestSession } from "~/services/guest";
import { colors, space, type as typo } from "~/theme/moaddi";

/* Placeholder phone: +999 is an unassigned country code, so the number is
 * E.164-valid (server requires one) but can never match a real account's
 * phone during merge-by-phone. */
const makePlaceholderPhone = () =>
  "+999" + String(Math.floor(Math.random() * 1e11)).padStart(11, "0");

/**
 * Shown when an un-signed-in user taps checkout. Lets them either log in or
 * continue as a guest with no questions asked — a synthetic phone is saved
 * to satisfy the server. On success the guest session is stored and
 * `onComplete(guest)` fires so the caller can immediately re-run the
 * purchase with the new session.
 */
export default function GuestCheckoutModal({
  isVisible,
  onClose,
  onLogin,
  onComplete,
}) {
  const { t } = useTranslation();
  const { setUser } = useUser();
  const [busy, setBusy] = useState(false);

  const close = () => {
    setBusy(false);
    onClose?.();
  };

  const handleLogin = () => {
    setBusy(false);
    onLogin?.();
  };

  const handleGuest = async () => {
    setBusy(true);
    try {
      const guest = await startGuestSession(setUser);
      await saveGuestInfo({ phone: makePlaceholderPhone() });
      setBusy(false);
      onComplete?.(guest);
    } catch (err) {
      setBusy(false);
      alert("error", err?.message ?? t("somethingWentWrong"));
    }
  };

  return (
    <BottomSheet isVisible={isVisible} onClose={close} title={t("checkout")}>
      <View style={{ paddingHorizontal: space.gutter, gap: 16 }}>
        {busy ? (
          <Loader message={t("loading")} />
        ) : (
          <>
            <Text style={{ ...typo.body, color: colors.textMuted }}>
              {t("guestCheckoutPrompt")}
            </Text>
            <Button fullWidth onPress={handleLogin}>
              {t("logIn")}
            </Button>
            <Button fullWidth variant="secondary" onPress={handleGuest}>
              {t("continueAsGuest")}
            </Button>
          </>
        )}
      </View>
    </BottomSheet>
  );
}
