"use client";
import {
  ADMIN_LOGOUT_EVENT,
  getStoredAuthToken,
} from "@/../lib/auth-session";
import { socketAddress } from "@/../services/serverAddresses";
import Cookies from "js-cookie";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

const socketContext = createContext();
function SocketContextProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [machineStatus, setMachineStatus] = useState(null);
  const [notification, setNotification] = useState(null);
  const [liveEvents, setLiveEvents] = useState(null);
  const [machineEvents, setMachineEvents] = useState(null);
  const Types = {
    Notification: () => {
      setNotification((prev) => !prev);
    },
    Connections: (body) => {
      // machine.isConnected
      setLiveEvents(body.data);
    },
    MachineStatus: (body) => {
      // machine.isActive
      setMachineStatus(body.data);
    },
    PaymentRequests: (body) => {
      //   if (cookies?.role === "Admin") {
      //     setPurchaseRequest((data) => [...data, body.data]);
      //     setRequestPopup(true);
      //   }
    },
    PaymentRequestsResponse: (body) => {
      // if (
      //   cookies?.role === "Customer" &&
      //   cookies?._id === body.data.customerId
      // ) {
      //   if (body.data.status === "PaymentRejected") {
      //     setRequestApproved(2);
      //     setTimeout(() => {
      //       setRequestApproved(0);
      //       navigate("/");
      //     }, 1000);
      //   } else if (body.data.status === "PaymentDone") {
      //     setRequestApproved(body.data);
      //   }
      // }
    },
    else: (body) => {
      setMachineEvents(body.data);
    },
  };
  const activeClient = () => {
    const token = getStoredAuthToken();
    if (!token) return null;
    if (socket?.auth?.token === token) return socket;
    return reSocket();
  };

  const publishData = (data) => {
    const client = activeClient();
    if (!client) return;
    const send = () => client.emit("ControlRequest", data);
    if (client.connected) send();
    else client.once("connect", send);
  };
  const customerRequestAccept = (data) => {
    const client = activeClient();
    client?.emit("RequestsResponse", data);
  };
  const controlDirectMachine = (data) => {
    const client = activeClient();
    if (!client) return;
    const send = () => client.emit("ControlDirectMachineRequest", data);
    if (client.connected) send();
    else client.once("connect", send);
  };
  const controlBluetooth1Machine = (data) => {
    const client = activeClient();
    if (!client) return;
    const send = () => client.emit("ControlBluetooth1MachineRequest", data);
    if (client.connected) send();
    else client.once("connect", send);
  };
  const controlBluetooth2Machine = (data) => {
    const client = activeClient();
    if (!client) return;
    const send = () => client.emit("ControlBluetooth2MachineRequest", data);
    if (client.connected) send();
    else client.once("connect", send);
  };
  const disconnectSocket = useCallback(() => {
    if (socket?.disconnect) socket.disconnect();
    setSocket(null);
    setMachineStatus(null);
    setLiveEvents(null);
    setMachineEvents(null);
    setNotification(null);
  }, [socket]);

  const reSocket = useCallback(() => {
    const token = getStoredAuthToken();
    if (!token) return null;
    if (socket?.disconnect) socket.disconnect();
    const newSocket = io(socketAddress(), {
      auth: { token },
      transports: ["websocket"],
    });
    setSocket(newSocket);
    return newSocket;
  }, [socket]);

  useEffect(() => {
    if (socket) return;
    reSocket();
  }, [socket, reSocket]);

  useEffect(() => {
    const onLogout = () => disconnectSocket();
    window.addEventListener(ADMIN_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(ADMIN_LOGOUT_EVENT, onLogout);
  }, [disconnectSocket]);

  useEffect(() => {
    if (!socket) return;
    const onEvents = (body) => {
      Types[body.type] ? Types[body.type](body) : Types.else(body);
    };
    const onSocketError = (payload) => {
      if (!Cookies.get("user")) return;
      const msg =
        payload &&
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload
          ? String(payload.message)
          : typeof payload === "string"
            ? payload
            : "Request failed";
      toast.error(msg);
    };
    const onConnectError = (err) => {
      if (!Cookies.get("user")) return;
      toast.error(err?.message || "Could not connect to server");
    };
    socket.on("Events", onEvents);
    socket.on("error", onSocketError);
    socket.on("connect_error", onConnectError);
    return () => {
      socket.off("Events", onEvents);
      socket.off("error", onSocketError);
      socket.off("connect_error", onConnectError);
    };
  }, [socket]);

  return (
    <socketContext.Provider
      value={{
        socket,
        machineStatus,
        liveEvents,
        machineEvents,
        notification,
        controlDirectMachine,
        publishData,
        customerRequestAccept,
        controlBluetooth1Machine,
        controlBluetooth2Machine,
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
