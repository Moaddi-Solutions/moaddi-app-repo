import { fromByteArray, toByteArray } from "base64-js";
import { Base64 } from "react-native-ble-plx";

const SERVICE_UUID = "0000ffc0-0000-1000-8000-00805f9b34fb";
const WRITE_CHARACTERISTIC_UUID = "0000ffc1-0000-1000-8000-00805f9b34fb";
const NOTIFY_CHARACTERISTIC_UUID = "0000ffc2-0000-1000-8000-00805f9b34fb";
const HANDSHAKE_COMMAND = [
  /**
   * [142, 251, 6, 23, 12, 169, 104, 35, 123, 76, 210, 45, 223, 250, 102, 91, 79, 232]
   */
  0x8e, 0xfb, 0x06, 0x17, 0x0c, 0xa9, 0x68, 0x23, 0x7b, 0x4c, 0xd2, 0x2d, 0xdf,
  0xfa, 0x66, 0x5b, 0x4f, 0xe8,
];

function handshakeCommand(): Base64 {
  const commandBytes = Uint8Array.from(HANDSHAKE_COMMAND);
  /**
   * '8efb06170ca968237b4cd22ddffa665b4fe8'
   */
  return fromByteArray(commandBytes);
}

/**
 *
 * @param lockNumber from 1 to 12
 * @returns base64
 */
function unlockCommand(lockNumber: number): Base64 | null {
  if (lockNumber < 1 || lockNumber > 12) return null;
  const commandBytes = Uint8Array.from([
    0xff, // 255
    0x4f, // 97
    0x50, // 80
    0x45, // 69
    0x4e, // 78
    0x00,
    lockNumber,
    0x00,
    0x00,
    0xfe,
  ]);
  /**
   * 1    ->  'ff4f50454e00010000fe'
   * 2    ->  'ff4f50454e00020000fe'
   * 3    ->  'ff4f50454e00030000fe'
   * 4    ->  'ff4f50454e00040000fe'
   * 5    ->  'ff4f50454e00050000fe'
   * 6    ->  'ff4f50454e00060000fe'
   * 7    ->  'ff4f50454e00070000fe'
   * 8    ->  'ff4f50454e00080000fe'
   * 9    ->  'ff4f50454e00090000fe'
   * 10   ->  'ff4f50454e000a0000fe'
   * 11   ->  'ff4f50454e000b0000fe'
   * 12   ->  'ff4f50454e000c0000fe'
   * all  ->  'ff4f50454e000d0000fe'
   */
  return fromByteArray(commandBytes); // correct base64 for raw bytes
}

/**
 * @param {string} base64String
 * @returns {object|null}
 */
const parseLockStatusFeedback = (
  base64String: string
): Array<boolean> | null => {
  const decodedString = toByteArray(base64String);
  const [head, ...locks] = Array.from(decodedString);
  const [tail] = locks.splice(-1, 1);
  if (tail !== 0x1b) return null;
  if (!(head === 0x1c || head === 0x1d || head === 0x1e)) return null;
  if (locks.length !== 12) return null;
  return locks.map((status) => status == 0xf0);
};

export {
  handshakeCommand,
  NOTIFY_CHARACTERISTIC_UUID,
  parseLockStatusFeedback,
  SERVICE_UUID,
  unlockCommand,
  WRITE_CHARACTERISTIC_UUID,
};
