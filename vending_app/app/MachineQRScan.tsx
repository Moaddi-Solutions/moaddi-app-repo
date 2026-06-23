import { CameraView, useCameraPermissions } from "expo-camera";
import { usePathname, useRouter } from "expo-router";
import { SquareDashed } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    setTimeout(requestPermission, 500);
  }, []);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }
  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        {/* <Text>We need your permission to show the camera</Text> */}
        {/* <Button onPress={requestPermission} title="grant permission" /> */}
      </View>
    );
  }
  async function handleQRCodeScanned({ data }: { data: string }) {
    if (pathname != "/MachineQRScan") return;
    if (data.startsWith("g_")) {
      /** @ts-ignore */
      router.replace(`/GroupProducts/${data}`);
      return;
    }
    router.replace(`/MachineProducts/${data}`);
  }
  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    height: "80%",
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
