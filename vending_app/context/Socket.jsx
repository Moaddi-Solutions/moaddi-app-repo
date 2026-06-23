import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useUser } from "~/context/UserContext";
import { socketAddress } from "~/services/serverAddresses";
const socketContext = createContext();

function SocketContextProvider({ children }) {
  const { user } = useUser();
  const [socket, setSocket] = useState(null);
  const [machineStatus, setMachineStatus] = useState(null);
  const [liveEvents, setLiveEvents] = useState(null);
  const [machineEvents, setMachineEvents] = useState(null);
  const Types = {
    Connections: (body) => {
      // machine.isConnected
      setLiveEvents(body.data);
    },
    MachineStatus: (body) => {
      // machine.isActive
      setMachineStatus(body.data);
    },
    PaymentRequests: (body) => {},
    PaymentRequestsResponse: (body) => {},
    else: (body) => {
      setMachineEvents(body.data);
    },
  };
  const publishData = (data) =>
    (socket && socket.auth.token ? socket : reSocket()).emit(
      "ControlRequest",
      data
    );
  const customerRequestAccept = (data) => {
    (socket ?? reSocket()).emit("RequestsResponse", data);
  };
  const log = (...data) => {
    (socket ?? reSocket()).emit("ExpoLog", ...data);
  };
  const controlDirectMachine = (data) =>
    (socket && socket.auth.token ? socket : reSocket()).emit(
      "ControlDirectMachineRequest",
      data
    );
  const bluetooth2MachineComplete = (data) =>
    (socket && socket.auth.token ? socket : reSocket()).emit(
      "Bluetooth2MachineComplete",
      data
    );
  const bluetooth3MachineComplete = (data) =>
    (socket && socket.auth.token ? socket : reSocket()).emit(
      "Bluetooth3MachineComplete",
      data
    );
  const bluetooth4MachineComplete = (data) =>
    (socket && socket.auth.token ? socket : reSocket()).emit(
      "Bluetooth4MachineComplete",
      data
    );
  const bluetooth5MachineComplete = (data) =>
    (socket && socket.auth.token ? socket : reSocket()).emit(
      "Bluetooth5MachineComplete",
      data
    );
  const reSocket = () => {
    if (socket?.disconnect) socket.disconnect();
    const token = user?.token;
    const newSocket = io(socketAddress, {
      auth: { token },
      transports: ["websocket"],
    });
    setSocket(newSocket);
    return newSocket;
  };

  useEffect(() => {
    if (!user) return;
    if (socket) return;
    reSocket();
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on("Events", (body) => {
      Types[body.type] ? Types[body.type](body) : Types.else(body);
    });
  }, [socket]);
  return (
    <socketContext.Provider
      value={{
        socket,
        machineStatus,
        liveEvents,
        machineEvents,
        controlDirectMachine,
        bluetooth2MachineComplete,
        bluetooth3MachineComplete,
        bluetooth4MachineComplete,
        bluetooth5MachineComplete,
        publishData,
        customerRequestAccept,
        log,
      }}
    >
      {children}
    </socketContext.Provider>
  );
}

const useSocket = () => {
  const context = useContext(socketContext);
  if (context === undefined)
    throw new Error("useSocket must be used within a SocketContextProvider");
  return context;
};

export { SocketContextProvider, useSocket };
