import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { setItem } from "~/lib/utils";
import { getRequest } from "~/services/httpClient";
import { userAPI } from "~/services/serverAddresses";
import {
  SocialAuthCancelled,
  signInWithApple,
  signInWithGoogle,
  type SocialLoginResult,
} from "~/services/socialAuth";
import { isGoogleConfigured } from "~/config/socialAuth";
import { colors, radius, sizes, type as typo } from "~/theme/moaddi";
import { Button } from "./Button";

/** Multicolour Google "G" mark. */
function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

export function SocialAuthButtons() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useUser();
  const [busy, setBusy] = useState<null | "google" | "apple">(null);

  const showGoogle = isGoogleConfigured;
  // Apple button is iOS-only per App Store guidelines.
  const showApple = Platform.OS === "ios";

  if (!showGoogle && !showApple) return null;

  const persistAndGo = async (res: SocialLoginResult) => {
    setUser(res as any);
    await setItem("user", res);
    alert("success", t("loggedInSuccessfully"));
    getRequest(userAPI(res._id))
      .then((full) => {
        setUser((prev: any) => ({ ...prev, ...full }));
      })
      .finally(() => {
        router.dismissAll();
      });
  };

  const run = async (
    provider: "google" | "apple",
    fn: () => Promise<SocialLoginResult>,
  ) => {
    if (busy) return;
    setBusy(provider);
    try {
      const res = await fn();
      await persistAndGo(res);
    } catch (err) {
      if (err instanceof SocialAuthCancelled) return; // user backed out
      alert("error", err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.borderStrong }} />
        <Text style={{ ...typo.caption, color: colors.textMuted }}>
          {t("orContinueWith")}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.borderStrong }} />
      </View>

      {showGoogle ? (
        <Button
          variant="outline"
          fullWidth
          disabled={busy !== null}
          onPress={() => run("google", signInWithGoogle)}
          icon={busy === "google" ? undefined : <GoogleGlyph />}
        >
          {busy === "google" ? (
            <ActivityIndicator color={colors.textHeading} />
          ) : (
            t("continueWithGoogle")
          )}
        </Button>
      ) : null}

      {showApple ? <AppleButton busy={busy === "apple"} onPress={() => run("apple", signInWithApple)} /> : null}
    </View>
  );
}

/** Native Apple button — imported lazily so it never loads off iOS. */
function AppleButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const AppleAuthentication = require("expo-apple-authentication");
  return (
    <View style={{ opacity: busy ? 0.6 : 1 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={
          AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
        }
        buttonStyle={
          AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={radius.pill}
        style={{ width: "100%", height: sizes.controlH }}
        onPress={busy ? undefined : onPress}
      />
    </View>
  );
}

export default SocialAuthButtons;
