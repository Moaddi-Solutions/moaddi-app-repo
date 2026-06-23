import {
  fromByteArray as from8Array,
  toByteArray as toUint8Array,
} from "base64-js";
import {
  AES,
  Base64 as Base64Encoder,
  ECB,
  NoPadding,
  WordArray,
} from "crypto-es";

const STATIC_KEY_HEX = WordArray.create(
  new Uint8Array([
    0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb,
    0xcc, 0xdd, 0xee, 0xff,
  ])
);

function parseHexInput(text, expectedLength) {
  const arr = [];
  for (let i = 0; i < expectedLength; i++) {
    const h = text.slice(i * 2, i * 2 + 2);
    arr.push(h ? parseInt(h, 16) : 0);
  }
  return Uint8Array.from(arr);
}

function toHexString(byteArray) {
  return Array.prototype.map
    .call(byteArray, function (byte) {
      return ("0" + (byte & 0xff).toString(16)).slice(-2);
    })
    .join("");
}

// fromByteArray
function fromByteArray(hexInput) {
  const encrypted = AES.encrypt(WordArray.create(hexInput), STATIC_KEY_HEX, {
    mode: ECB,
    padding: NoPadding,
  });
  return encrypted.toString();
}

// toByteArray
function toByteArray(encryptedBase64Input) {
  const decrypted = AES.decrypt(encryptedBase64Input, STATIC_KEY_HEX, {
    mode: ECB,
    padding: NoPadding,
  });
  return toUint8Array(decrypted.toString(Base64Encoder));
}

function toByteArrayWithoutDecrypt(encryptedBase64Input) {
  return toUint8Array(encryptedBase64Input);
}

function logE(msg, hex) {
  const value = toHexString(
    toByteArrayWithoutDecrypt(fromByteArray(parseHexInput(hex, 16)))
  );
  console.log(msg, hex, "->", value);
  return value;
}

function logD(msg, hex) {
  const value = toHexString(toByteArray(from8Array(parseHexInput(hex, 16))));
  console.log(msg, hex, "<-", value);
}

logE("Bluetooth - APP (Init)", "FCCF5A5A5A5A5A5A5A5A5A5A5A5A5A5A");
logD("Bluetooth - APP (Init)", "EB17C59F054C88AD78233622645B4C2B");
// the result of XOR is: 63
logE("APP - Bluetooth (Xor)", "A902FCCF635A5A5A5A5A5A5A5A5A5A5A");
logD("APP - Bluetooth (Xor)", "f2d6f23d66001d5aad95a10e0ab9c968");
// Password: 44FE09DC
logE("Bluetooth - APP (Password)", "A90D3E44FE09DC5A5A5A5A5A5A5A5A5A");
logD("Bluetooth - APP (Password)", "C306106FCB2CE29B9C20419A2FDF2442");
// Box number: 01
logE("APP - Bluetooth (Open)", "A708010203040506010144FE09DC5A5A");
logD("APP - Bluetooth (Open)", "69B5D6F80CEB6746646AB0E4B54520F7");
// feedback done
logE("Bluetooth - APP (Feedback)", "A70D5A5A5A5A5A5A5A5A5A5A5A5A5A5A");
logD("Bluetooth - APP (Feedback)", "6840693EB166F76E923E791B5B55DE17");
