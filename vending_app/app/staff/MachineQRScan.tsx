import { Camera, CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Stack, usePathname, useRouter } from "expo-router";
import { Image as ImageIcon, SquareDashed } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Text as UIText } from "~/components/ui/text";
import alert from "~/lib/alert";
import { getRequest } from "~/services/httpClient";
import { machineQRScan } from "~/services/serverAddresses";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanningGallery, setScanningGallery] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  // Handler for manual permission request
  const handleRequestPermission = async () => {
    console.log("Button clicked - requesting permission");
    console.log(
      "Current permission state:",
      JSON.stringify(permission, null, 2),
    );

    if (!permission) {
      console.log("Permission is null, waiting...");
      return;
    }

    if (!permission.canAskAgain) {
      console.log("Permission cannot be asked again - opening settings");
      // Open device settings so user can grant permission manually
      if (Platform.OS === "ios") {
        Linking.openURL("app-settings:");
      } else {
        Linking.openSettings();
      }
      return;
    }

    try {
      console.log("Calling Camera.requestCameraPermissionsAsync() directly");
      // Use Camera API directly instead of hook's requestPermission which seems to hang
      const result = await Camera.requestCameraPermissionsAsync();
      console.log("Permission result:", JSON.stringify(result, null, 2));

      // The permission state should update automatically via the hook, but if not, we can force a refresh
      if (!result.granted) {
        // Permission was denied, user might need to go to settings
        console.log("Camera permission denied");
        console.log("Can ask again:", result.canAskAgain);
      } else {
        console.log("Camera permission granted!");
        // Force component to re-check permission state
        // The hook should update automatically, but we can trigger a re-render if needed
      }
    } catch (error) {
      console.error("Error requesting camera permission:", error);
    }
  };

  // Request permission automatically on mount (optional - can be removed if you only want manual request)
  useEffect(() => {
    // Only auto-request on first mount, not every time
    if (permission === null) {
      // Permission is still loading, wait for it
      return;
    }
    // Don't auto-request if already denied - let user click button
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <>
        <Stack.Screen
          options={{
            title: t("machineQrScan"),
            headerBackTitle: "",
          }}
        />
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <UIText className="text-xl mb-4 text-center">
              {t("cameraPermissionRequired")}
            </UIText>
            {permission.canAskAgain ? (
              <TouchableOpacity
                onPress={handleRequestPermission}
                activeOpacity={0.7}
                style={{
                  backgroundColor: "#007AFF",
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  marginTop: 10,
                  minWidth: 200,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 16, fontWeight: "600" }}
                >
                  {t("grantPermission")}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <UIText className="text-base mb-4 text-center text-muted-foreground">
                  {t("permissionPermanentlyDenied")}
                </UIText>
                <TouchableOpacity
                  onPress={handleRequestPermission}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: "#007AFF",
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginTop: 10,
                    minWidth: 200,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 16, fontWeight: "600" }}
                  >
                    {t("openSettings")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </>
    );
  }
  async function handleQRCodeScanned({ data }: { data: string }) {
    if (pathname == "/staff/MachineQRScan") console.log(pathname);

    router.replace(`/staff/MachineProducts/${data}` as any);
  }

  function goHomeWithError(message: string) {
    alert("error", message);
    router.replace("/staff");
  }

  async function validateGalleryQr(data: string) {
    try {
      const machine = await getRequest(machineQRScan(data));
      if (machine?.statusCode || !(machine?._id || machine?.qrCode)) {
        goHomeWithError(t("invalidMachineQr"));
        return;
      }
      router.replace(`/staff/MachineProducts/${data}` as any);
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

  return (
    <>
      <Stack.Screen
        options={{
          title: t("machineQrScan"),
          headerBackTitle: "",
        }}
      />
      <View style={styles.container}>
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={handleQRCodeScanned}
          style={styles.camera}
        >
          <SquareDashed style={styles.icon} width={200} height={200} />
        </CameraView>
        <TouchableOpacity
          onPress={pickFromGallery}
          disabled={scanningGallery}
          activeOpacity={0.7}
          style={styles.galleryButton}
        >
          {scanningGallery ? (
            <ActivityIndicator color="white" />
          ) : (
            <ImageIcon size={20} color="white" />
          )}
          <Text style={styles.galleryButtonText}>{t("uploadFromGallery")}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    height: "80%",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  camera: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  icon: {
    width: 200,
    height: 200,
    color: "white",
  },
  galleryButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  galleryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
