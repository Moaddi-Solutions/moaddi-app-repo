const net = require("net");
const machinesRepo = require("../data/repos/machines");

let client = null;
let isConnected = false;
const messageQueue = [];

const connectClient = () => {
  client = net.createConnection(
    { path: "/var/ubuntu/run/bluetooth.sock" },
    () => {
      console.log("Connection to bluetooth.sock");
    }
  );

  client.on("connect", () => {
    console.log("Client connected to socket!");
    isConnected = true;

    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      client.write(message);
    }
  });

  client.on("data", async (data) => {
    const receivedData = data.toString().trim();
    try {
      const jsonData = JSON.parse(receivedData);
      const { command, params } = jsonData;
      await commands[command](params);
    } catch (error) {
      console.error("error", {
        type: "ParseError",
        message: error.message,
        data: receivedData,
      });
    }
  });

  client.on("end", () => {
    console.log("Disconnected from server");
    isConnected = false;
    client.destroy(); // Ensure the socket is fully closed
  });

  client.on("close", () => {
    console.log("Client connection closed.");
    console.log("Reconnecting ....");
    setTimeout(connectClient, 1000);
  });

  client.on("error", (err) => {
    console.error("Client socket error:", err);
    console.log("Reconnecting ....");
    setTimeout(connectClient, 1000);
  });
};

const commands = {
  heartbeat: async (params) => {
    console.log(`command heartbeat, params ${JSON.stringify(params)}`);
  },
  /**
   * Event: 'device.registered'
   * Fired when a device connects and successfully authenticates with a valid signature.
   * This is the primary event for knowing a device is online.
   *
   * Example Event Object:
   * {
   *   "deviceId": "MACHINE-123",
   *   "data": {
   *     "tid": "MACHINE-123",
   *     "times": "1677642301",
   *     "token": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
   *     "code": "B01E091D",
   *     "signal": "25",
   *     "imei": "123456789012345",
   *     "version": "1.0.1"
   *   }
   * }
   */
  "device.registered": async ({ machineId }) => {
    const eventsRepo = require("../data/repos/events");
    await eventsRepo.updateConnection(machineId, 1);
  },
  /**
   * Event: 'device.disconnected'
   * Fired when a registered device's connection is closed or lost.
   *
   * Example Event Object:
   * {
   *   "deviceId": "MACHINE-123"
   * }
   */
  "device.disconnected": async ({ machineId }) => {
    const eventsRepo = require("../data/repos/events");
    await eventsRepo.updateConnection(machineId, 0);
  },
  /**
   * Event: 'command.response'
   * Fired when a device sends a response to a command you previously sent.
   *
   * Example Event Object (for an 'Open Compartment' command):
   * {
   *   "deviceId": "MACHINE-123",
   *   "data": {
   *     "tid": "MACHINE-123",
   *     "times": "1677642311",
   *     "token": "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
   *     "code": "B05D8U16",
   *     "oid": "ORDER-ABC-456",
   *     "num": 1,
   *     "status": 1,
   *     "uid": "backend-system",
   *     "action": 0
   *   }
   * }
   */
  "command.response": async ({ deviceId }) => {},
  /**
   * Event: 'command.response.compartment.open'
   * Fired when a device sends a response to Open Compartment.
   *
   * Example Event Object (for an 'Open Compartment' command):
   * {
   *   "deviceId": "MACHINE-123",
   *   "data": {
   *     "tid": "MACHINE-123",
   *     "times": "1677642311",
   *     "token": "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
   *     "code": "B0250818",
   *     "oid": "ORDER-ABC-456",
   *     "num": 1,
   *     "status": 1,
   *     "uid": "1_2",
   *     "action": 0
   *   }
   * }
   */
  "command.response.compartment.open": async ({
    machineId,
    data: { status, oid, uid },
  }) => {
    const eventsRepo = require("../data/repos/events");
    if (status)
      await eventsRepo.create({
        purchaseId: oid,
        // machine_MAC
        machineId,
        type: "LOCKER",
        value: 0,
        boxes: [uid],
        machineType: "direct",
      });
  },
  /**
   * Event: 'device.heartbeat'
   * Fired on every successful heartbeat ('#') received from a device.
   *
   * Example Event Object:
   * {
   *   "deviceId": "MACHINE-123"
   * }
   */
  "device.heartbeat": async ({ deviceId }) => {},
  "machine.data.request": async ({ deviceId }) => {
    const machine = await machinesRepo.getById(
      `machine_${deviceId}`,
      false,
      false
    );
    if (machine)
      return sendToBroker("machine.data", {
        deviceId: machine.mac,
        password: machine.password,
      });
    sendToBroker("machine.data", {
      deviceId: deviceId,
      error: true,
    });
  },
};

const sendToBroker = (command, params) => {
  console.log(
    `[Bluetooth Sending] (${command}) data to Device message:`,
    params
  );
  return _send(JSON.stringify({ command, params }));
};

const _send = (message) => {
  if (isConnected && client.writable) return client.write(message);

  // If not connected, queue the message and trigger a connection attempt
  console.log("Client not ready. Queuing message...");
  messageQueue.push(message);

  // Attempt to connect if not already in the process
  if (!client || client.destroyed) connectClient();
};

// connectClient();

// sendToBroker("heartbeat", {});
// sendToBroker("door.open", { deviceId, orderId, container, lane });
// sendToBroker("device.reboot", { deviceId });
// sendToBroker("machine.data", { deviceId, password });
module.exports = {
  sendToBroker,
};
