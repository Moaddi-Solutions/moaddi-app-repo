import { toByteArray as toUint8Array } from "base64-js";
import {
  AES,
  Base64 as Base64Encoder,
  ECB,
  NoPadding,
  WordArray,
} from "crypto-es";
import { Base64 } from "react-native-ble-plx";

const SERVICE_UUID = "0000ffb0-0000-1000-8000-00805f9b34fb";
const WRITE_CHARACTERISTIC_UUID = "0000ffb1-0000-1000-8000-00805f9b34fb";
const NOTIFY_CHARACTERISTIC_UUID = "0000ffb2-0000-1000-8000-00805f9b34fb";

const FILL = 0x5a;

const STATIC_KEY_HEX = WordArray.create(
  new Uint8Array([
    0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb,
    0xcc, 0xdd, 0xee, 0xff,
  ])
);

// fromByteArray
function fromByteArray(hexInput: Uint8Array) {
  const encrypted = AES.encrypt(WordArray.create(hexInput), STATIC_KEY_HEX, {
    mode: ECB,
    padding: NoPadding,
  });
  return encrypted.toString();
}

// toByteArray
function toByteArray(encryptedBase64Input: Base64) {
  const decrypted = AES.decrypt(encryptedBase64Input, STATIC_KEY_HEX, {
    mode: ECB,
    padding: NoPadding,
  });
  return toUint8Array(decrypted.toString(Base64Encoder));
}

// xor(parseHex(input))
function xor(input: Uint8Array) {
  return input.reduce((prev, curr) => prev ^ curr, 0);
}

function parseHexInput(text: string, expectedLength: number) {
  const arr = [];
  for (let i = 0; i < expectedLength; i++) {
    const h = text.slice(i * 2, i * 2 + 2);
    arr.push(h ? parseInt(h, 16) : 0);
  }
  return Uint8Array.from(arr);
}

function parseInit(input: Uint8Array) {
  if (
    !(
      input[0] == 0xfc && //
      input[1] == 0xcf
    )
  )
    return false;
  return true;
}

function parseLockStatusFeedback(input: Uint8Array) {
  if (
    !(
      input[0] == 0xa7 && //
      input[1] == 0x0d
    )
  )
    return false;
  return true;
}

function parsePassword(input: Uint8Array) {
  if (
    !(
      input[0] == 0xa9 && //
      input[1] == 0x0d
    )
  )
    return false;
  // const voltage = input[2];
  const password = input.slice(3, 7);
  return password;
}

function initMessage(input: string): Base64 {
  const id = parseHexInput(input, 6);
  const frame = new Uint8Array(16).fill(FILL);
  frame[0] = 0xa9;
  frame[1] = 0x02;
  frame[2] = 0xfc;
  frame[3] = 0xcf;
  frame[4] = xor(id);
  return fromByteArray(frame);
}

/**
 *
 * @param lockNumber from 0 to 255
 * @returns base64
 */
function unlockCommand(
  lockNumber: number,
  password: Uint8Array
): Base64 | null {
  const frame = new Uint8Array(16).fill(FILL);
  frame[0] = 0xa7;
  frame[1] = 0x08;
  frame[2] = 0x01;
  frame[3] = 0x02;
  frame[4] = 0x03;
  frame[5] = 0x04;
  frame[6] = 0x05;
  frame[7] = 0x06;
  frame[8] = lockNumber;
  frame[9] = 0x01;
  for (let i = 0; i < 4; i++) frame[10 + i] = password[i];
  return fromByteArray(frame);
}

export {
  initMessage,
  NOTIFY_CHARACTERISTIC_UUID,
  parseInit,
  parseLockStatusFeedback,
  parsePassword,
  SERVICE_UUID,
  toByteArray,
  unlockCommand,
  WRITE_CHARACTERISTIC_UUID,
};
