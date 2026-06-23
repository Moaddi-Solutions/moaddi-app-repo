import { fromByteArray, toByteArray } from "base64-js";
import { Base64 } from "react-native-ble-plx";
import { arrayEqual } from "~/services/blu/blu-3/signals";
import passwords from "~/services/blu/blu-5/passwords.json";

export const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
export const WRITE_CHARACTERISTIC_UUID = "0000fff4-0000-1000-8000-00805f9b34fb";
export const NOTIFY_CHARACTERISTIC_UUID =
  "0000fff4-0000-1000-8000-00805f9b34fb";

const classA = [1, 2, 3, 4, 5];
const classB = [6, 7, 8, 9, 10];
const classC = [11, 12, 24, 0.5];
const doorMap = [0xa1, 0xa2, 0xa3, 0xa4];

function parseTime(time: number) {
  let index;
  if (~(index = classA.indexOf(time))) return ["A", ++index] as ["A", number];
  if (~(index = classB.indexOf(time))) return ["B", ++index] as ["B", number];
  if (~(index = classC.indexOf(time))) return ["C", ++index] as ["C", number];
  throw new Error("out of range");
}

function parsePassword(password: string) {
  return password.split("").map((n) => parseInt(n));
}

/* Build */

function buildChargeFrame(machineId: number, time: number): Base64 {
  const [className, pkg] = parseTime(time);
  const row = passwords.find(({ id }) => id == machineId);
  if (!row) throw new Error("id not found");
  const password = parsePassword(
    row[className][Math.floor(Math.random() * 25)]
  );
  const frame = Uint8Array.from([pkg, ...password]);
  return fromByteArray(frame);
}

function buildStopChargeFrame(): Base64 {
  const frame = Uint8Array.from([0x05, 0x05, 0x05, 0x05, 0x05, 0x05]);
  return fromByteArray(frame);
}

function buildUnlockFrame(machineId: number, box: number): Base64 {
  const row = passwords.find(({ id }) => id == machineId);
  if (!row) throw new Error("id not found");
  const password = parsePassword(row.A[Math.floor(Math.random() * 25)]);
  const frame = Uint8Array.from([doorMap[--box], ...password]);
  return fromByteArray(frame);
}
/* Parse */

const parseChargeFeedback = (base64String: string): boolean => {
  const feedback = toByteArray(base64String);

  // header1
  const head1 = feedback.slice(0, 1);
  let expectedHead1 = [0xf0];
  if (!arrayEqual(expectedHead1, head1)) return false;

  // order1
  const order1 = feedback.slice(1, 2);
  let expectedOrder1 = [0x01];
  if (!arrayEqual(expectedOrder1, order1)) return false;

  // status
  const expectedStatus1 = [0x00];
  const status3 = feedback.slice(2, 3);
  if (!arrayEqual(expectedStatus1, status3)) return false;

  return true;
};

const parseStopChargeFeedback = (base64String: string): boolean => {
  const feedback = toByteArray(base64String);

  // header1
  const head1 = feedback.slice(0, 1);
  let expectedHead1 = [0xf0];
  if (!arrayEqual(expectedHead1, head1)) return false;

  // order1
  const order1 = feedback.slice(1, 2);
  let expectedOrder1 = [0x02];
  if (!arrayEqual(expectedOrder1, order1)) return false;

  // status
  const expectedStatus1 = [0x00];
  const status3 = feedback.slice(2, 3);
  if (!arrayEqual(expectedStatus1, status3)) return false;

  return true;
};

const parseUnlockFeedback = (base64String: string): boolean => {
  const feedback = toByteArray(base64String);

  // header1
  const head1 = feedback.slice(0, 1);
  let expectedHead1 = [0xf0];
  if (!arrayEqual(expectedHead1, head1)) return false;

  // order1
  const order1 = feedback.slice(1, 2);
  let expectedOrder1 = [0x03];
  if (!arrayEqual(expectedOrder1, order1)) return false;

  // status
  const expectedStatus1 = [0x00];
  const status3 = feedback.slice(2, 3);
  if (!arrayEqual(expectedStatus1, status3)) return false;

  return true;
};

export {
  buildChargeFrame,
  buildStopChargeFrame,
  buildUnlockFrame,
  parseChargeFeedback,
  parseStopChargeFeedback,
  parseUnlockFeedback,
};
