// App.js
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Service & Characteristic UUIDs (full 128-bit form)
const SERVICE_UUID = "0000fee7-0000-1000-8000-00805f9b34fb";

// 36F5 and 36F6 The length is always a fixed 16 bytes.
// iOS and Android The application communicates with the Bluetooth lock through them;
// Read Notify
const CHAR_READ_UUID = "000036f6-0000-1000-8000-00805f9b34fb";
// write
const CHAR_COMM_UUID = "000036f5-0000-1000-8000-00805f9b34fb"; // characteristic used for commands

const CMDs = {
  OpenRefill: 0x00,
  StartCharging: 0x01,
  StopCharging: 0x02,
};
// Helper: convert byte array to base64 string (react-native-ble-plx uses base64 payloads)
function bytesToBase64(bytes) {
  const b = String.fromCharCode.apply(null, bytes);
  return base64.encode(b);
}

function hexByte(n) {
  return n & 0xff;
}

// Build frames according to the protocol in your doc
// Execute command: 05 AA 07 PWD[6] CMD TOKEN[4] FILL[2]  (total 16)
function buildExecuteCmdFrame(password6, cmdByte, token4) {
  const frame = new Uint8Array(16).fill(0);
  frame[0] = 0x05;
  frame[1] = 0xaa;
  frame[2] = 0x07;
  // password6: must be array of 6 bytes
  for (let i = 0; i < 6; i++) frame[3 + i] = password6[i] || 0x00;
  frame[9] = cmdByte & 0xff;
  for (let i = 0; i < 4; i++) frame[10 + i] = token4[i] || 0x00;
  // last two bytes left as 0 (fill)
  return Array.from(frame);
}

// Multi-channel unlock: 05 81 09 PWD[6] CHM[3] TOKEN[4] (total 16)
function buildMultiUnlockFrame(password6, chm3, token4) {
  const frame = new Uint8Array(16).fill(0);
  frame[0] = 0x05;
  frame[1] = 0x81;
  frame[2] = 0x09;
  for (let i = 0; i < 6; i++) frame[3 + i] = password6[i] || 0x00;
  for (let i = 0; i < 3; i++) frame[9 + i] = chm3[i] || 0x00; // channel mask
  for (let i = 0; i < 4; i++) frame[12 + i] = token4[i] || 0x00;
  return Array.from(frame);
}

export default function App() {
  const managerRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [pwdText, setPwdText] = useState("000000");
  const [tokenText, setTokenText] = useState("00000000");
  const [log, setLog] = useState([]);

  useEffect(() => {
    const m = new BleManager();
    managerRef.current = m;
    return () => {
      m.destroy();
    };
  }, []);

  function appendLog(s) {
    setLog((l) => [s, ...l].slice(0, 200));
  }

  async function startScan() {
    setDevices([]);
    setScanning(true);
    appendLog("Scanning...");
    try {
      managerRef.current.startDeviceScan(
        [SERVICE_UUID],
        null,
        (error, device) => {
          if (error) {
            appendLog("Scan error: " + error.message);
            setScanning(false);
            return;
          }
          if (!device) return;
          // collect unique devices
          setDevices((prev) => {
            if (prev.find((d) => d.id === device.id)) return prev;
            return [
              ...prev,
              {
                id: device.id,
                name: device.name || device.localName || "Unknown",
                device,
              },
            ];
          });
        }
      );
      // auto stop after 10s
      setTimeout(() => {
        try {
          managerRef.current.stopDeviceScan();
        } catch (e) {}
        setScanning(false);
        appendLog("Scan stopped");
      }, 10000);
    } catch (e) {
      appendLog("Start scan failed: " + e.message);
      setScanning(false);
    }
  }

  async function connectTo(d) {
    appendLog("Connecting to " + d.id);
    try {
      const dev = await managerRef.current.connectToDevice(d.id, {
        autoConnect: false,
      });
      await dev.discoverAllServicesAndCharacteristics();
      setConnectedDevice(dev);
      appendLog("Connected: " + d.id);
    } catch (e) {
      appendLog("Connect error: " + e.message);
      Alert.alert("Connect failed", e.message);
    }
  }

  async function writeCommand(bytes) {
    if (!connectedDevice) {
      Alert.alert("No device connected");
      return;
    }
    const b64 = bytesToBase64(bytes);
    appendLog(
      "Writing: " + bytes.map((x) => x.toString(16).padStart(2, "0")).join(" ")
    );
    try {
      const c =
        await managerRef.current.writeCharacteristicWithResponseForDevice(
          connectedDevice.id,
          SERVICE_UUID,
          CHAR_COMM_UUID,
          b64
        );
      appendLog("Write success");
      // Optionally read response or subscribe to notifications
    } catch (e) {
      appendLog("Write error: " + e.message);
      Alert.alert("Write failed", e.message);
    }
  }

  function parseHexInput(text, expectedLength) {
    // accepts plain digits or hex string like "01 02 03" or "010203"
    const cleaned = text.replace(/[^0-9a-fA-F]/g, "");
    const arr = [];
    for (let i = 0; i < expectedLength; i++) {
      const h = cleaned.substr(i * 2, 2);
      arr.push(h ? parseInt(h, 16) : 0);
    }
    return arr;
  }

  async function onOpenRefill() {
    const pwd = parseHexInput(pwdText, 6);
    const token = parseHexInput(tokenText, 4);
    const frame = buildExecuteCmdFrame(pwd, 0x00, token); // CMD=00 open refill
    await writeCommand(frame);
  }

  async function onUnlockForBuy(channelIndex) {
    // build channel mask: 24 bits across 3 bytes, LSB is channel 0
    const mask = [0, 0, 0];
    const bit = 1 << channelIndex % 8;
    const idx = Math.floor(channelIndex / 8);
    mask[idx] = bit;
    const pwd = parseHexInput(pwdText, 6);
    const token = parseHexInput(tokenText, 4);
    const frame = buildMultiUnlockFrame(pwd, mask, token);
    await writeCommand(frame);
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>
        Expo BLE Broker — Simple
      </Text>
      <View style={{ marginVertical: 8 }}>
        <Button
          title={scanning ? "Scanning..." : "Scan (10s)"}
          onPress={startScan}
          disabled={scanning}
        />
      </View>

      <Text>Found devices:</Text>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => connectTo(item)}
            style={{ padding: 8, borderBottomWidth: 1 }}
          >
            <Text>
              {item.name} — {item.id}
            </Text>
          </TouchableOpacity>
        )}
        style={{ maxHeight: 160 }}
      />

      <View style={{ marginTop: 8 }}>
        <Text>Password (6 bytes hex):</Text>
        <TextInput
          value={pwdText}
          onChangeText={setPwdText}
          placeholder="000000"
        />
        <Text>Token (4 bytes hex):</Text>
        <TextInput
          value={tokenText}
          onChangeText={setTokenText}
          placeholder="00000000"
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Button title="Open Refill Door" onPress={onOpenRefill} />
        <Button title="Unlock Ch0" onPress={() => onUnlockForBuy(0)} />
        <Button title="Unlock Ch1" onPress={() => onUnlockForBuy(1)} />
        <Button title="Unlock Ch2" onPress={() => onUnlockForBuy(2)} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: "bold" }}>Log:</Text>
        <FlatList
          data={log}
          keyExtractor={(item, index) => String(index)}
          renderItem={({ item }) => <Text>{item}</Text>}
          style={{ maxHeight: 200 }}
        />
      </View>
    </SafeAreaView>
  );
}
