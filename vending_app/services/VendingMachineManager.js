// VendingMachineManager.js
// الإصدار النهائي: يستخدم دوال قياسية بدلاً من مكتبة Buffer

// لا حاجة لاستيراد Buffer بعد الآن

// 1. تعريف الثوابت (Constants)
const SERVICE_UUID = "0000ffc0-0000-1000-8000-00805f9b34fb";
const WRITE_CHARACTERISTIC_UUID = "0000ffc1-0000-1000-8000-00805f9b34fb";
const NOTIFY_CHARACTERISTIC_UUID = "0000ffc2-0000-1000-8000-00805f9b34fb";
const HANDSHAKE_COMMAND = [
  0x06, 0x8e, 0xfb, 0x00, 0x17, 0x0c, 0xa9, 0x68, 0x23, 0x7b, 0x4c, 0xd2, 0x2d,
  0xdf, 0xfa, 0x66, 0x5b, 0x4f, 0xe8, 0x00,
];

/**
 * دالة لإنشاء أمر فتح القفل
 * @param {number} lockNumber - رقم القفل (من 1 إلى 12)
 * @returns {string} - الأمر بصيغة Base64 جاهز للإرسال
 */
function createUnlockCommandAsBase64(lockNumber) {
  if (lockNumber < 1 || lockNumber > 12) {
    throw new Error("رقم القفل غير صالح. يجب أن يكون بين 1 و 12.");
  }
  const commandBytes = [
    0xff,
    0x4f,
    0x50,
    0x45,
    0x4e,
    0x00,
    lockNumber,
    0x00,
    0x00,
    0xfe,
  ];
  // تحويل مصفوفة البايت إلى Base64
  return btoa(String.fromCharCode.apply(null, commandBytes));
}

/**
 * دالة لتحليل الرد القادم من المكينة (هذه هي النسخة المصححة)
 * @param {string} base64String - الرد القادم من خاصية notify بصيغة base64
 * @returns {object|null}
 */
function parseLockStatusFeedback(base64String) {
  // atob هي دالة قياسية في JavaScript لفك تشفير Base64 إلى سلسلة نصية
  const decodedString = atob(base64String);

  // تحويل السلسلة النصية إلى مصفوفة من أرقام البايت
  const byteArray = [];
  for (let i = 0; i < decodedString.length; i++) {
    byteArray.push(decodedString.charCodeAt(i));
  }

  if (
    byteArray.length !== 14 ||
    byteArray[0] !== 0x1c ||
    byteArray[13] !== 0x1b
  ) {
    // console.error("حزمة بيانات حالة الأقفال غير صالحة:", byteArray);
    return null;
  }

  const lockStates = {};
  for (let i = 1; i <= 12; i++) {
    const lockByte = byteArray[i];
    lockStates[`lock_${i}`] = lockByte === 0xf0 ? "ON" : "OFF";
  }
  return lockStates;
}

/**
 * الدالة الرئيسية التي سيتم استدعاؤها من واجهة المستخدم
 * @param {string} macAddress - عنوان MAC الخاص بالمكينة
 * @param {number} lockToOpen - رقم القفل المراد فتحه
 * @param {function(object): void} onStatusUpdate - دالة callback لتحديث الواجهة بالحالة
 */
export async function openVendingMachineLock(
  macAddress,
  lockToOpen,
  onStatusUpdate
) {
  // let deviceConnection = null;
  // try {
  //   onStatusUpdate({ message: "Connecting..." });
  //   deviceConnection = await bleManager.connectToDevice(macAddress);
  //   onStatusUpdate({ message: "Connected! Discovering services..." });
  //   await deviceConnection.discoverAllServicesAndCharacteristics();
  //   // الاشتراك في الإشعارات (Notifications)
  //   deviceConnection.monitorCharacteristicForDevice(
  //     macAddress,
  //     SERVICE_UUID,
  //     NOTIFY_CHARACTERISTIC_UUID,
  //     (error, characteristic) => {
  //       if (error) {
  //         onStatusUpdate({ error: `Monitoring Error: ${error.message}` });
  //         return;
  //       }
  //       const status = parseLockStatusFeedback(characteristic.value); // characteristic.value is already base64
  //       if (status) {
  //         onStatusUpdate({ status });
  //         if (status[`lock_${lockToOpen}`] === "ON") {
  //           onStatusUpdate({
  //             message: "SUCCESS: Lock confirmed open!",
  //             success: true,
  //           });
  //           bleManager.cancelDeviceConnection(macAddress);
  //         }
  //       }
  //     }
  //   );
  //   onStatusUpdate({ message: "Subscribed. Performing handshake..." });
  //   // إرسال أمر المصادقة (Handshake)
  //   const handshakeBase64 = btoa(
  //     String.fromCharCode.apply(null, HANDSHAKE_COMMAND)
  //   );
  //   await deviceConnection.writeCharacteristicWithResponseForDevice(
  //     macAddress,
  //     SERVICE_UUID,
  //     WRITE_CHARACTERISTIC_UUID,
  //     handshakeBase64
  //   );
  //   onStatusUpdate({
  //     message: "Handshake successful. Sending unlock command...",
  //   });
  //   await new Promise((resolve) => setTimeout(resolve, 200));
  //   // إرسال أمر فتح القفل
  //   const unlockCommandBase64 = createUnlockCommandAsBase64(lockToOpen);
  //   await deviceConnection.writeCharacteristicWithResponseForDevice(
  //     macAddress,
  //     SERVICE_UUID,
  //     WRITE_CHARACTERISTIC_UUID,
  //     unlockCommandBase64
  //   );
  //   onStatusUpdate({
  //     message: "Unlock command sent. Waiting for confirmation...",
  //   });
  // } catch (error) {
  //   onStatusUpdate({
  //     error: `Workflow Error: ${error.message}`,
  //     success: false,
  //   });
  //   if (deviceConnection) {
  //     bleManager.cancelDeviceConnection(macAddress);
  //   }
  // }
}
