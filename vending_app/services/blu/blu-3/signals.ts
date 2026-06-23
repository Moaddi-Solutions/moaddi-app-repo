import { fromByteArray, toByteArray } from "base64-js";
import { Base64 } from "react-native-ble-plx";

// first
// 06010101
// token
// 075bba71

// motor
// buildMultiUnlockFrame -> Chanel [0, 17, 19]
// 058109303030303030 01000A 075bba71
// 05810930303030303001000A075bba71

// buildMultiUnlockFrame -> Chanel [0, 16]
// 058109303030303030 010001 075bba71
// 058109303030303030010001075bba71

// big door
// 058109303030303030040000075bba71
export const SERVICE_UUID = "0000fee7-0000-1000-8000-00805f9b34fb";
export const WRITE_CHARACTERISTIC_UUID = "000036f5-0000-1000-8000-00805f9b34fb";
export const NOTIFY_CHARACTERISTIC_UUID =
  "000036f6-0000-1000-8000-00805f9b34fb";

// Definitions
/**
 *  PMS refers to factory parameters.
 *
 *  RETM[3] The channel status mask is returned, (24 bits).
 *    Each bit value of 0 indicates that the channel was successfully unlocked,
 *    and 1 indicates that the channel failed to unlock.
 *
 *  LVL[1] represents the battery percentage, with valid values ​​ranging from 0x00 to 0x64
 *    0x00 = 0%
 *    0x64 = 100%
 *
 *  PWD[6] The unlocking password
 *
 *  CHM[3] This is the unlocking channel mask, (24 bits),
 *    with each bit valued at 1 to indicate validity;
 *    for example, 050000 indicates that unlocking action is performed on channels 0 and 2.
 *
 *  CMI[1]
 *    00 indicates opening the replenishment door
 *    01 indicates starting charging
 *    02 indicates stopping charging;
 */

// * *** 3.2 ***
// * Set Factory Parameters
/**
 *   Send:     50 4D , 09 , PMS[9] , TOKEN[4]
 *   Receive:  50 4D , 01 , RET[1] , FILL[12]
 *     RET = 00 success
 *     RET = 01 fail
 */

//  * *** 3.3 ***
//  * Read factory parameters
/**
 *   Send:    50 4E 01 01 , TOKEN[4] , FILL[8]
 *   Receive: 50 4F 09    , PMS[9]   , FILL[4]
 */

//  * *** 3.7 ***
//  * Get battery level
/**
 * *** 3.7 ***
 * Get battery level
 *   Send:     02 01 01 01 , TOKEN[4] , FILL[8]
 *   Receive:  02 02 01    , LVL[1]   , FILL[12]
 */

//  * *** 3.10 ***
//  * Multi-channel unlocking
/**
 *   Send:    05 81 09 , PWD[6]  , CHM[3]   , TOKEN[4]
 *   Receive: 05 82 03 , RETM[3] , FILL[10]
 */

//  * *** 3.13 ***
//  * Multi-channel lock
/**
 *   Send:    05 8C 03 , CHM[3]  , TOKEN[4] , FILL[6]
 *   Receive: 05 8D 03 , RETM[3] ,          , FILL[10]
 *   Receive: 05 88 03 , RETM[3] ,          , FILL[10]

*/

//  * *** 3.16 ***
//  * Change password
/**
 *    Send:    05 03 06 , OLDPWD[6]  , TOKEN[4] , FILL[3]
 *    Delay
 *    Send:    05 04 06 , NEWPWD[6]  , TOKEN[4] , FILL[3]
 *    Receive: 05 05 01 , RET                   , FILL[12]
 *      RET:
 *      00:  Indicates that the password change was successful
 *      01:  Indicates that the password change failed
 */

//  * *** 3.17 ***
//  * Modify key
/**
 *    Send:    07 01 08 , KEYL[8]  , TOKEN[4] , FILL[1]
 *    Delay
 *    Send:    07 02 08 , KEYH[8]  , TOKEN[4] , FILL[1]
 */

//  * *** 3.36 ***
//  * Execute instructions
/**
 *    Send:    05 AA 07 , PWD[6]  , CMI[1] , TOKEN[4] , FILL[2]
 *    Receive: 05 AB 02 , RET     , CMI[1]            , FILL[11]
 *      RET:
 *      00:  Indicating success.
 *      FF:  This indicates that the command is not supported.
 *      FE:  This indicates a password mismatch
 *      otherwise, it indicates failure.
 */

const FILL = 0x00;
export const CMDs = {
  OpenRefill: 0x00,
  StartCharging: 0x01,
  StopCharging: 0x02,
};

// function parseHexInput(text: string, expectedLength: number) {
//   const arr = [];
//   for (let i = 0; i < expectedLength; i++) {
//     const h = text.slice(i * 2, i * 2 + 2);
//     arr.push(h ? parseInt(h, 16) : 0);
//   }
//   return arr;
// }

// generateChannelMask([0, 1, 2, 23, 5]) // 0 ~ 23

function generateChannelMask(channels: Array<number>) {
  const mask = [0x00, 0x00, 0x00];
  channels.forEach((channel) => {
    const byteIndex = Math.floor(channel / 8); // 0, 1, or 2
    const bitPosition = channel % 8; // 0-7
    mask[byteIndex] |= 1 << bitPosition;
  });
  return mask;
}

function channelMaskToStatus(channel: Uint8Array) {
  return Array.from({ length: 24 }).map((_, channelNumber) => {
    const channelByte = Math.floor(channelNumber / 8);
    const channelBit = channelNumber % 8;
    return (channel[channelByte] & (1 << channelBit)) === 0;
  });
}

function fillBytes(length: number, value = 0): number[] {
  return Array(length).fill(value);
}

export function arrayEqual(arr1: number[], arr2: Uint8Array) {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((element, index) => element === arr2[index]);
}

function asciiToHex(str: string) {
  return Uint8Array.from({ length: str.length }, (_, i) => str.charCodeAt(i));
}

function asciiReplacing(utf8String: string, replacementChar?: string) {
  let asciiString = "";
  for (let i = 0; i < utf8String.length; i++) {
    const charCode = utf8String.charCodeAt(i);
    if (charCode >= 0 && charCode <= 127)
      asciiString += String.fromCharCode(charCode);
    else if (replacementChar) asciiString += replacementChar;
  }
  return asciiString;
}

// Execute command: 05 AA 07 PWD[6] CMD TOKEN[4] FILL[2]  (total 16)
// function buildExecuteCmdFrame(
//   cmdByte: number, // CMDs.OpenRefill
//   password12: string, // "ff00000000ff" // 12 degit
//   token8: string // "ff0000ff" // 8 degit
// ): Base64 {
//   const password6 = parseHexInput(password12, 6);
//   const token4 = parseHexInput(token8, 4);
//   const frame = new Uint8Array(16).fill(0);
//   frame[0] = 0x05;
//   frame[1] = 0xaa;
//   frame[2] = 0x07;
//   for (let i = 0; i < 6; i++) frame[3 + i] = password6[i] as unknown as number;
//   frame[9] = cmdByte;
//   for (let i = 0; i < 4; i++) frame[10 + i] = token4[i] as unknown as number;
//   // last two bytes left as 0 (fill)
//   return fromByteArray(frame);
// }

// Multi-channel unlock: 05 81 09 PWD[6] CHM[3] TOKEN[4] (total 16)
// function buildMultiUnlockFrame(
//   channels: Array<number>, // 0 ~ 23
//   password12: string, // "ff00000000ff" // 12 degit
//   token8: string // "ff0000ff" // 8 degit
// ): Base64 {
//   const password6 = parseHexInput(password12, 6);
//   const token4 = parseHexInput(token8, 4);
//   const mask = generateChannelMask(channels);
//   const frame = new Uint8Array(16).fill(0);
//   frame[0] = 0x05;
//   frame[1] = 0x81;
//   frame[2] = 0x09;
//   for (let i = 0; i < 6; i++) frame[3 + i] = password6[i] as unknown as number;
//   for (let i = 0; i < 3; i++) frame[9 + i] = mask[i];
//   for (let i = 0; i < 4; i++) frame[12 + i] = token4[i] as unknown as number;
//   return fromByteArray(frame);
// }

function buildMultiLockFrame(
  channels: Array<number>, // [0 ~ 23]
  token4: Uint8Array
): Base64 {
  // 058c03 303030303030 040000 075bba71
  // 058c03303030303030040000075bba71

  const channel3 = generateChannelMask(channels);
  const frame = Uint8Array.from([
    0x05,
    0x8c,
    0x03,
    ...channel3,
    ...token4,
    ...fillBytes(6),
  ]);
  return fromByteArray(frame);
}

function buildMultiUnlockFrame(
  channels: Array<number>, // [0 ~ 23]
  password6: Uint8Array,
  token4: Uint8Array
): Base64 {
  const channel3 = generateChannelMask(channels);
  const frame = Uint8Array.from([
    // chanel [1] -> [02, 0, 0]
    // 058109 303030303030 020000 075bba71
    // 058109303030303030020000075bba71

    // open big door
    // chanel [2] -> [04, 0, 0]
    // 058109 303030303030 040000 075bba71
    // 058109303030303030040000075bba71

    // chanel [3] -> [08, 0, 0]
    // 058109 303030303030 080000 075bba71
    // 058109303030303030080000075bba71

    // chanel [4] -> [16, 0, 0]
    // 058109 303030303030 160000 075bba71
    // 058109303030303030160000075bba71

    // chanel [1, 2, 3] -> [14, 0, 0]
    // 058109 303030303030 140000 075bba71
    // 058109303030303030140000075bba71

    // Motor ( no chanel)
    // A50301000A
    /**
        Data format: Header + Length + Command

        Header: 0xa5

        Length: Number of bytes in the command section

        Command:

        Function Data Unlock Motor number + Timeout
            
        4. Command Details:

        1) Start a specific motor:

        The APP sends the command 0xa5 0x03 data1 data2 data3,

        For example, to start motor 1 with a timeout of 10 seconds, the data format is: A5 03 01 00 0A

        If the motor is idle, the command will be executed and then communicated via nortify. Reply: 0xa5 0xa5 0xa5.

        If the motor is busy, pass via Nortify. Reply: 0xa5 0xa5 0x00.

        If motor 1 completes starting, pass via Nortify. Reply: 0xa5 0xa5 0x01.

        If motor 2 completes starting, pass via Nortify. Reply: 0xa5 0xa5 0x02.

        If motor 1 or 2 times out during starting, pass via Nortify. Reply: 0xa5 0xa5 0xf.
        Send feedback
        Side panels
        History
        Saved 
 */
    // 058109 303030303030 A50301000A 075bba71
    // 058109303030303030A50301000A075bba71

    0x05,
    0x81,
    0x09,
    ...password6,
    ...channel3,
    ...token4,
  ]);

  return fromByteArray(frame);
}

function buildBatteryFrame(token4: Uint8Array) {
  //  * 02 01 01 01 , TOKEN[4] , FILL[8]
  //    02010101 075bba71 000000000000
  //    02010101075bba71000000000000
  const frame = [
    //
    0x02,
    0x01,
    0x01,
    0x01,
    ...token4,
  ];
  return fromByteArray(
    Uint8Array.from({ length: 16 }, (_, i) => frame[i] ?? FILL)
  );
}

function buildHandshakeFrame() {
  // 06010101
  const frame = [0x06, 0x01, 0x01, 0x01];
  return fromByteArray(Uint8Array.from(frame));
}
// Execute command: 05 AA 07 PWD[6] CMD TOKEN[4] FILL[2]  (total 16)
function buildExecuteCmdFrame(
  cmdByte: number, // CMDs.OpenRefill
  password6: Uint8Array,
  token4: Uint8Array
) {
  // 05aa07 303030303030 00 5bba71e7 0000
  // 05aa07 303030303030 00 075bba71 0000
  // 05aa0730303030303000075bba710000
  const frame = Uint8Array.from([
    0x05,
    0xaa,
    0x07,
    ...password6,
    cmdByte,
    ...token4,
    ...fillBytes(2),
  ]);
  return fromByteArray(frame);
}

function buildPasswordChangeFrames(
  oldPassword6: Uint8Array,
  newPassword6: Uint8Array,
  token4: Uint8Array
) {
  //  *  Send:    05 03 06 , OLDPWD[6]  , TOKEN[4] , FILL[3]
  //  *  Delay
  //  *  Send:    05 04 06 , NEWPWD[6]  , TOKEN[4] , FILL[3]
  const frame1 = Uint8Array.from([
    0x05,
    0x03,
    0x06,
    ...oldPassword6,
    ...token4,
    ...fillBytes(3),
  ]);
  const frame2 = Uint8Array.from([
    0x05,
    0x04,
    0x06,
    ...newPassword6,
    ...token4,
    ...fillBytes(3),
  ]);
  return [fromByteArray(frame1), fromByteArray(frame2)];
}

/* Parse */

const parseLockFeedback = (
  base64String: string
): Array<boolean> | undefined => {
  //  *   Receive: 05 8D 03 , RETM[3] ,          , FILL[10]
  //  *   Receive: 05 88 03 , RETM[3] ,          , FILL[10]
  const feedback = toByteArray(base64String);
  const head3 = feedback.slice(0, 3);
  let expectedHead3 = [0x05, 0x8d, 0x03];
  if (!arrayEqual(expectedHead3, head3)) return;
  expectedHead3 = [0x05, 0x88, 0x03];
  if (!arrayEqual(expectedHead3, head3)) return;
  const retm3 = feedback.slice(3, 6);
  return Array.from(retm3).map((status) => !status);
};

const parseUnlockFeedback = (
  base64String: string
): Array<boolean> | undefined => {
  // 05 82 03 , RETM[3] , FILL[10]
  const feedback = toByteArray(base64String);
  const head3 = feedback.slice(0, 3);
  const expectedHead3 = [0x05, 0x82, 0x03];
  if (!arrayEqual(expectedHead3, head3)) return;
  const retm3 = feedback.slice(3, 6);
  return channelMaskToStatus(retm3);
};

const parseBatteryFeedback = (base64String: string): number | undefined => {
  // 02 02 01    , LVL[1]   , FILL[12]
  const feedback = toByteArray(base64String);
  const head3 = feedback.slice(0, 3);
  const expectedHead3 = [0x02, 0x02, 0x01];
  if (!arrayEqual(expectedHead3, head3)) return;
  const lvl1 = feedback[3];
  return lvl1;
};

const parseCommandFeedback = (
  base64String: string
): { command: number; result: number } | undefined => {
  // 05 AB 02 , RET     , CMI[1]            , FILL[11]
  const feedback = toByteArray(base64String);
  const head3 = feedback.slice(0, 3);
  const expectedHead3 = [0x05, 0xab, 0x02];
  if (!arrayEqual(expectedHead3, head3)) return;
  const ret1 = feedback[3];
  const cmi1 = feedback[4];
  return { command: cmi1, result: ret1 };
};

const parsePasswordChangeFeedback = (
  base64String: string
): boolean | undefined => {
  //  05 05 01 , RET                   , FILL[12]
  const feedback = toByteArray(base64String);
  const head3 = feedback.slice(0, 3);
  const expectedHead3 = [0x05, 0x05, 0x01];
  if (!arrayEqual(expectedHead3, head3)) return;
  const ret1 = feedback[3];
  return !ret1;
};

export {
  asciiReplacing,
  asciiToHex,
  /* * */
  buildBatteryFrame,
  buildExecuteCmdFrame,
  buildHandshakeFrame,
  buildMultiLockFrame,
  buildMultiUnlockFrame,
  buildPasswordChangeFrames,
  /* * */
  parseBatteryFeedback,
  parseCommandFeedback,
  parseLockFeedback,
  parsePasswordChangeFeedback,
  parseUnlockFeedback,
};
