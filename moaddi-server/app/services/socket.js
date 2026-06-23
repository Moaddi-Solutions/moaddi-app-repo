const eventsRepo = require("../data/repos/events");
const { completePayment } = require("../payment");
const jwt = require("jsonwebtoken");

const authenticateUser = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
};

/** DB roles are lowercase (`customer`); repo keys are PascalCase (`controlCustomer`). */
const resolveLockerControlHandler = (role) => {
  if (!role || typeof role !== "string") return null;
  const pascal = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  const key = "control" + pascal;
  const fn = eventsRepo[key];
  return typeof fn === "function" ? fn : null;
};

const handleSocketConnection = async (socket) => {
  console.log("Socket Client connected");
  console.log("socket.id:", socket.id);

  socket.on("ExpoLog", async (...data) => {
    console.log("ExpoLog ", ...data);
  });

  socket.on("ControlRequest", async (data) => {
    console.log("ControlRequest" + " data:", data);
    try {
      const user = await authenticateUser(socket.handshake.auth.token);
      const handler = resolveLockerControlHandler(user.role);
      if (!handler) {
        console.error("ControlRequest: no handler for role", user.role);
        socket.emit("error", {
          message: "Locker control is not available for this account type.",
        });
        return;
      }
      return await handler(data, user);
    } catch (error) {
      console.error("ControlRequest failed", error);
      const isAuthError = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError';
      socket.emit("error", {
        message: isAuthError ? "Authentication failed" : (error.message || "Request failed"),
      });
    }
  });

  socket.on("ControlDirectMachineRequest", async (data) => {
    console.log("ControlDirectMachineRequest" + " data:", data);
    try {
      const user = await authenticateUser(socket.handshake.auth.token);
      return await eventsRepo.controlDirectMachine(data, user);
    } catch (error) {
      console.error("Authentication failed", error);
      socket.emit("error", { message: "Authentication failed" });
    }
  });

  socket.on("ControlBluetooth1MachineRequest", async (data) => {
    console.log("ControlBluetooth1MachineRequest" + " data:", data);
    try {
      const user = await authenticateUser(socket.handshake.auth.token);
      return await eventsRepo.controlBluetooth1Machine(data, user);
    } catch (error) {
      console.error("Authentication failed", error);
      socket.emit("error", { message: "Authentication failed" });
    }
  });

  socket.on("Bluetooth2MachineComplete", async (data) => {
    console.log("Bluetooth2MachineComplete" + " data:", data);
    try {
      const user = await authenticateUser(socket.handshake.auth.token);
      return await eventsRepo.bluetooth2MachineComplete(data, user);
    } catch (error) {
      console.error("Authentication failed", error);
      socket.emit("error", { message: "Authentication failed" });
    }
  });

  socket.on("Bluetooth3MachineComplete", async (data) => {
    console.log("Bluetooth3MachineComplete" + " data:", data);
    try {
      const user = await authenticateUser(socket.handshake.auth.token);
      return await eventsRepo.bluetooth3MachineComplete(data, user);
    } catch (error) {
      console.error("Authentication failed", error);
      socket.emit("error", { message: "Authentication failed" });
    }
  });

  socket.on("Bluetooth4MachineComplete", async (data) => {
    console.log("Bluetooth4MachineComplete" + " data:", data);
    try {
      const user = await authenticateUser(socket.handshake.auth.token);
      return await eventsRepo.bluetooth4MachineComplete(data, user);
    } catch (error) {
      console.error("Authentication failed", error);
      socket.emit("error", { message: "Authentication failed" });
    }
  });

  socket.on("Bluetooth5MachineComplete", async (data) => {
    console.log("Bluetooth5MachineComplete" + " data:", data);
    try {
      const user = await authenticateUser(socket.handshake.auth.token);
      return await eventsRepo.bluetooth5MachineComplete(data, user);
    } catch (error) {
      console.error("Authentication failed", error);
      socket.emit("error", { message: "Authentication failed" });
    }
  });

  socket.on("RequestsResponse", async (data) => {
    try {
      const user = await authenticateUser(socket.handshake.auth.token);
      await completePayment(data, user);
    } catch (error) {
      console.error("RequestsResponse failed", error);
      socket.emit("error", { message: "Authentication or payment completion failed" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket Client disconnected");
  });
};

// Data publish to clients using Socket IO
const socketPublish = async (message, topic = "Events", print = false) => {
  let socketIo = global.io;
  if (print) {
    console.log("Publishing to topic:", topic, "with message:", message);
  }
  return socketIo.emit(topic, message);
};

module.exports = {
  handleSocketConnection,
  socketPublish,
};
