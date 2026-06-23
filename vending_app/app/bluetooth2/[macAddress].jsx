import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSocket } from "~/context/Socket";
import { openVendingMachineLock } from "~/services/VendingMachineManager";

const VendingScreen = () => {
  const { macAddress } = useLocalSearchParams();
  const lockToOpen = 5;
  const { controlBluetooth2Machine } = useSocket();

  const [status, setStatus] = useState("Ready to start.");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleOpenLock = () => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    const onStatusUpdate = (update) => {
      console.log(update);
      if (update.message) setStatus(update.message);
      if (update.error) {
        setError(update.error);
        setIsLoading(false);
      }
      if (update.success) {
        setIsSuccess(true);
        setIsLoading(false);
      }
    };

    controlBluetooth2Machine({
      machineId: `machine_${macAddress}`,
      box: lockToOpen,
    });
    // openVendingMachineLock(macAddress, lockToOpen, onStatusUpdate);
  };

  return (
    <View style={styles.container}>
      <Text>Machine MAC: {macAddress}</Text>
      <Text style={styles.status}>Status: {status}</Text>

      {isLoading && <ActivityIndicator size="large" color="#0000ff" />}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {isSuccess && (
        <Text style={styles.successText}>Operation Successful!</Text>
      )}

      <Button
        title={`Open Lock #${lockToOpen}`}
        onPress={handleOpenLock}
        disabled={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  status: { margin: 20, fontSize: 18, fontWeight: "bold", textAlign: "center" },
  errorText: { color: "red", marginTop: 10 },
  successText: { color: "green", marginTop: 10, fontSize: 20 },
});

export default VendingScreen;
