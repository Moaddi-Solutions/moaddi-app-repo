import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getItem, removeItem, setItem } from "~/lib/utils";

const machineContext = createContext(null);
const MachineProvider = ({ children }) => {
  const [machine, setMachine] = useState(null);
  const [machines, setMachines] = useState([]);
  const [info, setInfo] = useState({});
  const [connectedDevice, setConnectedDevice] = useState(null);
  const bluSubscription = useRef(null);
  const [bluFeedback, setBluFeedback] = useState(null);
  const activeSubscriptions = useRef([]);

  useEffect(() => {
    getItem("machine").then((machineData) => {
      if (machineData) setMachine(machineData);
    });
    getItem("machines").then((machineData) => {
      if (machineData) setMachines(machineData);
    });
  }, []);

  useEffect(() => {
    if (!machine) return;
    setItem("machine", machine);
  }, [machine]);

  useEffect(() => {
    if (!machines) return;
    setItem("machines", machines);
  }, [machines]);

  const clearMachine = async () => {
    setMachine(null);
    await removeItem("machine");
  };

  const clearAll = async () => {
    setMachine(null);
    await removeItem("machine");
    setMachines([]);
    await removeItem("machines");
    setConnectedDevice(null);
    setBluFeedback(null);
  };

  return (
    <machineContext.Provider
      value={{
        machine,
        setMachine,
        clearMachine,
        info,
        setInfo,
        connectedDevice,
        setConnectedDevice,
        bluSubscription,
        activeSubscriptions,
        bluFeedback,
        setBluFeedback,
        machines,
        setMachines,
        clearAll,
      }}
    >
      {children}
    </machineContext.Provider>
  );
};

const useMachine = () => {
  const context = useContext(machineContext);
  if (!context)
    throw new Error("useMachine must be used within a MachineContextProvider");
  return context;
};
export { machineContext, MachineProvider, useMachine };
