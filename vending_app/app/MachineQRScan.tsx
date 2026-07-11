import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, usePathname, useRouter } from "expo-router";
import { Flashlight, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radius, space, type as typo } from "~/theme/moaddi";

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
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setTimeout(requestPermission, 500);
  }, []);

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
          {t("pointCameraAtQrCode")}
        </Text>
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
