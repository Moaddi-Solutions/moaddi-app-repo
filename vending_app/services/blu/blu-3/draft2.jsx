import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// services/bluetoothService.js
import { Buffer } from "buffer";
import * as Bluetooth from "expo-bluetooth";

class CommandBuilder {
  static createToken() {
    return [0x01, 0x02, 0x03, 0x04]; // Simple token, you might want to generate dynamically
  }

  static fillBytes(length, value = 0x00) {
    return Array(length).fill(value);
  }

  // Get battery level
  static getBatteryCommand() {
    const token = this.createToken();
    return [
      0x02,
      0x01,
      0x01,
      0x01, // Header
      ...token, // Token
      ...this.fillBytes(12), // Fill
    ];
  }

  // Multi-channel unlock
  static multiChannelUnlockCommand(password, channelMask) {
    const token = this.createToken();
    const pwdBytes = this.passwordToBytes(password);

    return [
      0x05,
      0x81,
      0x09, // Header
      ...pwdBytes, // Password
      ...channelMask, // Channel mask (3 bytes)
      ...token, // Token
    ];
  }

  // Multi-channel lock
  static multiChannelLockCommand(channelMask) {
    const token = this.createToken();

    return [
      0x05,
      0x8c,
      0x03, // Header
      ...channelMask, // Channel mask (3 bytes)
      ...token, // Token
      ...this.fillBytes(6), // Fill
    ];
  }

  // Execute command
  static executeCommandCommand(password, commandCode) {
    const token = this.createToken();
    const pwdBytes = this.passwordToBytes(password);

    return [
      0x05,
      0xaa,
      0x07, // Header
      ...pwdBytes, // Password
      commandCode, // Command code
      ...token, // Token
      ...this.fillBytes(2), // Fill
    ];
  }

  // Change password
  static changePasswordCommand(oldPassword, newPassword) {
    const token = this.createToken();
    const oldPwdBytes = this.passwordToBytes(oldPassword);
    const newPwdBytes = this.passwordToBytes(newPassword);

    const firstFrame = [
      0x05,
      0x03,
      0x06, // Header
      ...oldPwdBytes, // Old password
      ...token, // Token
      ...this.fillBytes(3), // Fill
    ];

    const secondFrame = [
      0x05,
      0x04,
      0x06, // Header
      ...newPwdBytes, // New password
      ...token, // Token
      ...this.fillBytes(3), // Fill
    ];

    return { firstFrame, secondFrame };
  }

  static passwordToBytes(password) {
    if (typeof password === "string") {
      // Convert string password to bytes (hex)
      const bytes = [];
      for (let i = 0; i < 6; i++) {
        const byte = parseInt(password.substr(i * 2, 2), 16);
        bytes.push(isNaN(byte) ? 0x00 : byte);
      }
      return bytes;
    }
    return password;
  }

  // Parse response
  static parseResponse(responseBytes) {
    if (!responseBytes || responseBytes.length < 3) return null;

    const command = responseBytes[0];
    const subCommand = responseBytes[1];
    const dataLength = responseBytes[2];

    switch (command) {
      case 0x02: // Battery response
        if (subCommand === 0x02) {
          return {
            type: "battery",
            level: responseBytes[3],
          };
        }
        break;

      case 0x05: // Lock/unlock response
        if (subCommand === 0x82 || subCommand === 0x8d) {
          return {
            type: subCommand === 0x82 ? "unlock" : "lock",
            channelStatus: responseBytes.slice(3, 6),
          };
        } else if (subCommand === 0xab) {
          return {
            type: "command",
            result: responseBytes[3],
            commandCode: responseBytes[4],
          };
        } else if (subCommand === 0x05) {
          return {
            type: "password_change",
            result: responseBytes[3],
          };
        }
        break;

      default:
        return null;
    }
  }
}

class BluetoothLockService {
  constructor() {
    this.device = null;
    this.serviceUUID = "FEE7";
    this.writeCharacteristicUUID = "36F5";
    this.readCharacteristicUUID = "36F6";
    this.isConnected = false;
  }

  // Scan for devices
  async scanForDevices() {
    try {
      const { granted } = await Bluetooth.requestPermissionsAsync();
      if (!granted) {
        throw new Error("Bluetooth permission not granted");
      }

      await Bluetooth.startDiscoveryAsync();

      const devices = [];
      const subscription = Bluetooth.addBluetoothDeviceDiscoveredListener(
        (device) => {
          if (device.name && device.name.includes("chengqu")) {
            devices.push(device);
          }
        }
      );

      // Scan for 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
      subscription.remove();
      await Bluetooth.stopDiscoveryAsync();

      return devices;
    } catch (error) {
      console.error("Scan error:", error);
      return [];
    }
  }

  // Connect to device
  async connectToDevice(deviceId) {
    try {
      this.device = await Bluetooth.connectToDeviceAsync(deviceId);
      this.isConnected = true;

      // Discover services
      await Bluetooth.discoverAllServicesAndCharacteristicsForDeviceAsync(
        deviceId
      );

      return true;
    } catch (error) {
      console.error("Connection error:", error);
      this.isConnected = false;
      return false;
    }
  }

  // Disconnect from device
  async disconnect() {
    if (this.device) {
      await Bluetooth.disconnectFromDeviceAsync(this.device.id);
      this.device = null;
      this.isConnected = false;
    }
  }

  // Send command to device
  async sendCommand(commandBytes) {
    if (!this.isConnected || !this.device) {
      throw new Error("Not connected to device");
    }

    try {
      const buffer = Buffer.from(commandBytes);
      await Bluetooth.writeCharacteristicAsync(
        this.device.id,
        this.serviceUUID,
        this.writeCharacteristicUUID,
        buffer.toString("base64")
      );

      // Listen for response
      return new Promise((resolve) => {
        const subscription = Bluetooth.addCharacteristicValueChangedListener(
          (characteristic) => {
            if (characteristic.characteristic === this.readCharacteristicUUID) {
              const response = Buffer.from(characteristic.value, "base64");
              subscription.remove();
              resolve(Array.from(response));
            }
          }
        );

        // Timeout after 5 seconds
        setTimeout(() => {
          subscription.remove();
          resolve(null);
        }, 5000);
      });
    } catch (error) {
      console.error("Send command error:", error);
      return null;
    }
  }

  // Parse manufacturer data from broadcast
  parseManufacturerData(manufacturerData) {
    if (!manufacturerData) return null;

    try {
      const data = Buffer.from(manufacturerData, "base64");
      const bytes = Array.from(data);

      // Check if it has 09 FF prefix (WeChat support)
      let offset = 0;
      if (bytes[0] === 0x09 && bytes[1] === 0xff) {
        offset = 2;
      }

      const id = bytes.slice(offset, offset + 2);
      const mac = bytes.slice(offset + 2, offset + 8);
      const deviceData = bytes.slice(offset + 8, offset + 13);

      return {
        id,
        mac: mac.map((b) => b.toString(16).padStart(2, "0")).join(":"),
        data: deviceData,
        battery: deviceData[1], // PWR is at index 1
        status: deviceData[2], // STA is at index 2
      };
    } catch (error) {
      console.error("Parse manufacturer data error:", error);
      return null;
    }
  }
}

export default function App() {
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [lockStatus, setLockStatus] = useState(null);

  useEffect(() => {
    return () => {
      BluetoothService.disconnect();
    };
  }, []);

  // done
  const scanDevices = async () => {
    setIsScanning(true);
    setDevices([]);

    const foundDevices = await BluetoothService.scanForDevices();
    setDevices(foundDevices);
    setIsScanning(false);
  };

  // done
  const connectDevice = async (device) => {
    const success = await BluetoothService.connectToDevice(device.id);
    if (success) {
      setConnectedDevice(device);
      Alert.alert("Success", `Connected to ${device.name}`);
    } else {
      Alert.alert("Error", "Failed to connect to device");
    }
  };

  // done
  const disconnectDevice = async () => {
    await BluetoothService.disconnect();
    setConnectedDevice(null);
    setBatteryLevel(null);
    setLockStatus(null);
  };

  // not
  const getBatteryLevel = async () => {
    const command = CommandBuilder.getBatteryCommand();
    const response = await BluetoothService.sendCommand(command);

    if (response) {
      const parsed = CommandBuilder.parseResponse(response);
      if (parsed && parsed.type === "battery") {
        setBatteryLevel(parsed.level);
      }
    }
  };

  // not
  const unlockChannel = async (channelNumber) => {
    // Create channel mask for single channel
    const channelMask = [0x00, 0x00, 0x00];
    channelMask[Math.floor(channelNumber / 8)] = 1 << channelNumber % 8;

    const password = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00]; // Default password
    const command = CommandBuilder.multiChannelUnlockCommand(
      password,
      channelMask
    );
    const response = await BluetoothService.sendCommand(command);

    if (response) {
      const parsed = CommandBuilder.parseResponse(response);
      if (parsed && parsed.type === "unlock") {
        const channelByte = Math.floor(channelNumber / 8);
        const channelBit = channelNumber % 8;
        const success =
          (parsed.channelStatus[channelByte] & (1 << channelBit)) === 0;

        setLockStatus(
          success
            ? `Channel ${channelNumber} unlocked`
            : `Channel ${channelNumber} lock failed`
        );
      }
    }
  };

  // not
  const lockChannel = async (channelNumber) => {
    const channelMask = [0x00, 0x00, 0x00];
    channelMask[Math.floor(channelNumber / 8)] = 1 << channelNumber % 8;

    const command = CommandBuilder.multiChannelLockCommand(channelMask);
    const response = await BluetoothService.sendCommand(command);

    if (response) {
      const parsed = CommandBuilder.parseResponse(response);
      if (parsed && parsed.type === "lock") {
        const channelByte = Math.floor(channelNumber / 8);
        const channelBit = channelNumber % 8;
        const success =
          (parsed.channelStatus[channelByte] & (1 << channelBit)) === 0;

        setLockStatus(
          success
            ? `Channel ${channelNumber} locked`
            : `Channel ${channelNumber} unlock failed`
        );
      }
    }
  };

  // not
  const executeCommand = async (commandCode) => {
    const password = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00]; // Default password
    const command = CommandBuilder.executeCommandCommand(password, commandCode);
    const response = await BluetoothService.sendCommand(command);

    if (response) {
      const parsed = CommandBuilder.parseResponse(response);
      if (parsed) {
        switch (parsed.result) {
          case 0x00:
            Alert.alert("Success", "Command executed successfully");
            break;
          case 0xfe:
            Alert.alert("Error", "Password mismatch");
            break;
          case 0xff:
            Alert.alert("Error", "Command not supported");
            break;
          default:
            Alert.alert("Error", "Command execution failed");
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Lock Controller</Text>

      <ScrollView style={styles.content}>
        {!connectedDevice ? (
          <>
            <TouchableOpacity style={styles.button} onPress={scanDevices}>
              <Text style={styles.buttonText}>
                {isScanning ? "Scanning..." : "Scan for Devices"}
              </Text>
            </TouchableOpacity>

            {devices.map((device, index) => (
              <TouchableOpacity
                key={index}
                style={styles.deviceItem}
                onPress={() => connectDevice(device)}
              >
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceId}>{device.id}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <View style={styles.connectedHeader}>
              <Text style={styles.connectedText}>
                Connected to: {connectedDevice.name}
              </Text>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={disconnectDevice}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={getBatteryLevel}
            >
              <Text style={styles.actionButtonText}>Get Battery Level</Text>
            </TouchableOpacity>

            {batteryLevel !== null && (
              <Text style={styles.statusText}>Battery: {batteryLevel}%</Text>
            )}

            <View style={styles.channelContainer}>
              <Text style={styles.sectionTitle}>Channel Control</Text>
              {[0, 1, 2].map((channel) => (
                <View key={channel} style={styles.channelRow}>
                  <Text style={styles.channelText}>Channel {channel}</Text>
                  <View style={styles.channelButtons}>
                    <TouchableOpacity
                      style={styles.channelButton}
                      onPress={() => unlockChannel(channel)}
                    >
                      <Text style={styles.channelButtonText}>Unlock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.channelButton}
                      onPress={() => lockChannel(channel)}
                    >
                      <Text style={styles.channelButtonText}>Lock</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.commandContainer}>
              <Text style={styles.sectionTitle}>Special Commands</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => executeCommand(0x00)} // Open replenishment door
              >
                <Text style={styles.actionButtonText}>
                  Open Replenishment Door
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => executeCommand(0x01)} // Start charging
              >
                <Text style={styles.actionButtonText}>Start Charging</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => executeCommand(0x02)} // Stop charging
              >
                <Text style={styles.actionButtonText}>Stop Charging</Text>
              </TouchableOpacity>
            </View>

            {lockStatus && <Text style={styles.statusText}>{lockStatus}</Text>}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  deviceItem: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  deviceId: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  connectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  connectedText: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  disconnectButton: {
    backgroundColor: "#FF3B30",
    padding: 10,
    borderRadius: 5,
  },
  disconnectButtonText: {
    color: "white",
    fontSize: 12,
  },
  actionButton: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
  },
  statusText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 10,
    padding: 10,
    backgroundColor: "white",
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 20,
  },
  channelContainer: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  channelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 5,
  },
  channelText: {
    fontSize: 16,
  },
  channelButtons: {
    flexDirection: "row",
  },
  channelButton: {
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 5,
    marginLeft: 5,
  },
  channelButtonText: {
    color: "white",
    fontSize: 12,
  },
  commandContainer: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
  },
});
