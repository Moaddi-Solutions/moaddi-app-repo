import { CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Stack, usePathname, useRouter } from "expo-router";
import { Flashlight, Image as ImageIcon, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import alert from "~/lib/alert";
import { openAppSettings } from "~/lib/permissions";
import { getRequest } from "~/services/httpClient";
import { groupAPI, machineQRScan } from "~/services/serverAddresses";
import { palette, space, type as typo } from "~/theme/moaddi";

const TEAL = palette.teal[400];

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = { position: "absolute" as const, width: 34, height: 34, borderColor: TEAL };
  const map = {
    tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
    tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
    bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
    br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  };
  return <View style={[base, map[pos]]} />;
}

export default function MachineQRScan() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanningGallery, setScanningGallery] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Only auto-ask while the OS is still willing to show its dialog; once it is
  // hard-denied the request resolves silently and the user needs the button below.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      const timer = setTimeout(requestPermission, 500);
      return () => clearTimeout(timer);
    }
  }, [permission?.granted, permission?.canAskAgain]);

  function goHomeWithError(message: string) {
    alert("error", message);
    router.replace("/");
  }

  async function handleQRCodeScanned({ data }: { data: string }) {
    if (pathname != "/MachineQRScan") return;
    if (data.startsWith("g_")) {
      // @ts-ignore dynamic route
      router.replace(`/GroupProducts/${data}`);
      return;
    }
    // @ts-ignore dynamic route
    router.replace(`/MachineProducts/${data}`);
  }

  async function validateGalleryQr(data: string) {
    try {
      if (data.startsWith("g_")) {
        const group = await getRequest(groupAPI(data));
        if (!group?.machines?.length) {
          goHomeWithError(t("invalidMachineQr"));
          return;
        }
        // @ts-ignore dynamic route
        router.replace(`/GroupProducts/${data}`);
        return;
      }

      const machine = await getRequest(machineQRScan(data));
      if (machine?.statusCode || !(machine?._id || machine?.qrCode)) {
        goHomeWithError(t("invalidMachineQr"));
        return;
      }
      // @ts-ignore dynamic route
      router.replace(`/MachineProducts/${data}`);
    } catch {
      goHomeWithError(t("invalidMachineQr"));
    }
  }

  async function pickFromGallery() {
    if (scanningGallery) return;
    setScanningGallery(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const codes = await scanFromURLAsync(result.assets[0].uri, ["qr"]);
      if (!codes.length) {
        goHomeWithError(t("noQrCodeFound"));
        return;
      }
      await validateGalleryQr(codes[0].data);
    } catch {
      goHomeWithError(t("noQrCodeFound"));
    } finally {
      setScanningGallery(false);
    }
  }

  const closeScanner = () => (router.canGoBack() ? router.back() : router.navigate("/"));

  const Overlay = (
    <View style={StyleSheet.absoluteFill}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space.gutter,
          paddingTop: insets.top + 8,
          paddingBottom: 14,
        }}
      >
        <Pressable onPress={closeScanner} hitSlop={10}>
          <X size={24} color="#fff" />
        </Pressable>
        <Text style={{ ...typo.title3, color: "#fff" }}>{t("scanQrCode")}</Text>
        <Pressable onPress={() => setTorch((v) => !v)} hitSlop={10}>
          <Flashlight size={24} color={torch ? TEAL : "#fff"} />
        </Pressable>
      </View>

      {/* Viewfinder */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 28, paddingHorizontal: space.gutter }}>
        <View
          style={{
            width: 240,
            height: 240,
            borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
          <View
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              top: "48%",
              height: 2,
              backgroundColor: TEAL,
              borderRadius: 2,
            }}
          />
        </View>
        <Text style={{ ...typo.body, color: "rgba(255,255,255,0.75)", textAlign: "center", maxWidth: 260 }}>
          {permission && !permission.granted
            ? t("cameraPermissionRequired")
            : t("pointCameraAtQrCode")}
        </Text>

        {/* Without this the screen is a dead end: the camera never appears and
            nothing on it can grant the permission back. */}
        {permission && !permission.granted ? (
          <Pressable
            onPress={permission.canAskAgain ? requestPermission : openAppSettings}
            accessibilityRole="button"
            style={{
              paddingHorizontal: 22,
              paddingVertical: 13,
              borderRadius: 14,
              backgroundColor: TEAL,
            }}
          >
            <Text style={{ ...typo.bodyStrong, color: "#101014" }}>
              {permission.canAskAgain ? t("grantPermission") : t("openSettings")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Gallery upload */}
      <View
        style={{
          paddingHorizontal: space.gutter,
          paddingBottom: insets.bottom + 24,
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={pickFromGallery}
          disabled={scanningGallery}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "rgba(255,255,255,0.12)",
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
            opacity: scanningGallery ? 0.6 : 1,
          }}
        >
          {scanningGallery ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ImageIcon size={22} color="#fff" />
          )}
          <Text style={{ ...typo.bodyStrong, color: "#fff" }}>{t("uploadFromGallery")}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#101014" }}>
      <Stack.Screen options={{ headerShown: false }} />
      {permission?.granted ? (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleQRCodeScanned}
          enableTorch={torch}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {Overlay}
    </View>
  );
}
