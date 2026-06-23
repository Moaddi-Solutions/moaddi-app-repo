// const mqtt = require("mqtt");
// const config = require("../../config");
// const eventsRepo = require("../data/repos/events");
// const fs = require("fs");

// let lastStatus = {}; // Stocke les derniers états des machines

// const options = {
//   protocol: "mqtt",
//   host: config.mqttForBluetooth2.host,
//   port: config.mqttForBluetooth2.port,
// };

// const client = mqtt.connect(options);

// // const client = {publish: function(){},on: function(){}, }

// // MQTT client error event
// client.on("error", (error) => {
//   console.error("MQTT 2 client connection error:", error.message);
// });

// // MQTT client connect event
// client.on("connect", async () => {
//   console.log("MQTT 2 Connected");

//   client.subscribe("vending/+/status");
// });

// // MQTT client disconnect event
// client.on("close", () => {
//   console.log("MQTT 2 client disconnected.");
// });

// const messageHandler = async (topic, message) => {
//   console.log("📩 Received:", topic, message.toString("hex"));
//   const mac = topic.split("/")[1];
//   lastStatus[mac] = message.toString("hex");
//   await eventsRepo.updateConnection(mac, lastStatus[mac]);
// };

// client.on("message", messageHandler);

// module.exports = {
//   client,
// };
