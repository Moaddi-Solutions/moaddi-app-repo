import { CameraView, useCameraPermissions, Camera } from "expo-camera";
import { Stack, usePathname, useRouter } from "expo-router";
import { SquareDashed } from "lucide-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Text as UIText } from "~/components/ui/text";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
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
              {t("cameraPermissionRequired") ||
                "Camera permission is required to scan QR codes"}
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
                  {t("grantPermission") || "Grant Permission"}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <UIText className="text-base mb-4 text-center text-muted-foreground">
                  {t("permissionPermanentlyDenied") ||
                    "Camera permission was permanently denied. Please enable it in your device settings."}
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
                    {t("openSettings") || "Open Settings"}
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
});
