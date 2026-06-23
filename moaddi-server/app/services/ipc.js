const net = require("net");

const client = net.createConnection({ path: "/tmp/bluetooth.sock" }, () => {
  client.write(
    JSON.stringify({
      command: "do",
      params: {
        me: 1,
      },
    })
  );
});

client.on("data", (data) => {
  const receivedData = data.toString().trim();

  client.end(); // Close the connection after receiving data
});

client.on("end", () => {
  console.log("Disconnected from server");
});

client.on("error", (err) => {
  console.error("Client error:", err);
});
