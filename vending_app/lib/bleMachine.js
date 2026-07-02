export const BLUETOOTH_MACHINE_TYPES = new Set([3, 4, 5, 6]);

export function isBleLinkedToMachine(machine, connectedDevice) {
  if (!machine || !connectedDevice) return false;
  return (
    connectedDevice.name === machine.name ||
    connectedDevice.localName === machine.name ||
    connectedDevice.id === machine.mac
  );
}
