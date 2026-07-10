import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { BottomSheet, Button, Input, Loader, PhoneInput } from "~/components/moaddi";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { saveGuestInfo, startGuestSession } from "~/services/guest";
import { colors, space, type as typo } from "~/theme/moaddi";

/**
 * Shown when an un-signed-in user taps checkout. Lets them either log in or
 * continue as a guest (phone required, name/email optional). On success the
 * guest session is stored and `onComplete(guest)` fires so the caller can
 * immediately re-run the purchase with the new session.
 */
export default function GuestCheckoutModal({
  isVisible,
  onClose,
  onLogin,
  onComplete,
}) {
  const { t } = useTranslation();
  const { setUser } = useUser();
  const [step, setStep] = useState("choice");
  const [formData, setFormData] = useState({ phone: "", name: "", email: "" });
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("choice");
    setFormData({ phone: "", name: "", email: "" });
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const handleLogin = () => {
    reset();
    onLogin?.();
  };

  const handleGuestSubmit = async () => {
    if (!formData.phone || formData.phone.replace(/\D/g, "").length < 8) {
      return alert("error", t("phoneRequired"));
    }
    setBusy(true);
    try {
      const guest = await startGuestSession(setUser);
      await saveGuestInfo({
        phone: formData.phone,
        name: formData.name || undefined,
        email: formData.email || undefined,
      });
      reset();
      onComplete?.(guest);
    } catch (err) {
      setBusy(false);
      alert("error", err?.message ?? t("somethingWentWrong"));
    }
  };

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={close}
      title={step === "choice" ? t("checkout") : t("continueAsGuest")}
    >
      <View style={{ paddingHorizontal: space.gutter, gap: 16 }}>
        {step === "choice" ? (
          <>
            <Text style={{ ...typo.body, color: colors.textMuted }}>
              {t("guestCheckoutPrompt")}
            </Text>
            <Button fullWidth onPress={handleLogin}>
              {t("logIn")}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onPress={() => setStep("form")}
            >
              {t("continueAsGuest")}
            </Button>
          </>
        ) : busy ? (
          <Loader message={t("loading")} />
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text
                style={{ ...typo.bodyStrong, fontSize: 13, color: colors.textHeading }}
              >
                {t("phone")}
              </Text>
              <PhoneInput
                value={formData.phone}
                onChangeText={(full) =>
                  setFormData((p) => ({ ...p, phone: full }))
                }
              />
            </View>
            <Input
              label={`${t("name")} (${t("optional")})`}
              value={formData.name}
              onChangeText={(name) => setFormData((p) => ({ ...p, name }))}
              placeholder={t("name")}
            />
            <Input
              label={`${t("email")} (${t("optional")})`}
              value={formData.email}
              onChangeText={(email) => setFormData((p) => ({ ...p, email }))}
              placeholder={t("email")}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button fullWidth onPress={handleGuestSubmit}>
              {t("continue")}
            </Button>
          </>
        )}
      </View>
    </BottomSheet>
  );
}
