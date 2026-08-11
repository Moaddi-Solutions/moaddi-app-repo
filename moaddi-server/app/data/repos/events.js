const moment = require("moment");
const shortId = require("shortid");
const config = require("../../../config");
const Events = require("../models/events");
const machinesRepo = require("../repos/machines");
const boxesRepo = require("../repos/boxes");
const purchasesRepo = require("../repos/purchases");
const { isAuthorizedOpener } = require("../../lib/purchaseAccess");
const { defineAbilityFor, subject } = require("../../lib/ability");
const { sendToBroker } = require("../../services/bluetooth.ipc");

/**
 * May this user service this machine — open its doors, reboot it?
 *
 * The socket hands us the JWT payload, which carries only `{_id, role}`, so the
 * full account is reloaded to pick up the shop scope the rules resolve against.
 * Asked as `update Box`, the same permission the Fill screen needs, because
 * opening a door is servicing the boxes inside it.
 *
 * Replaces `user.role == "Admin"`, which said yes to a Shop Admin standing in
 * front of any machine on the platform and no to a Super Admin.
 */
const canServiceMachine = async (user, machine) => {
  if (!machine) return false;
  const usersRepo = require("./users");
  const full = await usersRepo.checkUser(String(user._id)).catch(() => null);
  const ability = defineAbilityFor(full ?? user);
  return ability.can(
    "update",
    subject("Box", {
      vendorId: machine.vendorId ?? null,
      shopId: machine.shopId ?? null,
    })
  );
};

/** A buyer (or gift recipient) opening a box they have paid for. */
const isPaidOpener = (purchase, user) =>
  Boolean(purchase) &&
  isAuthorizedOpener(purchase, user._id) &&
  ["PaymentDone", "Processing"].includes(purchase.status);

/*
 * Create new event.
 */
let create = async (event, machine = null) => {
  const socketServer = require("../../services/socket");
  console.log("event:", event);

  machine ??= await machinesRepo.getById(event.machineId, false, false);
  console.log("machine:", machine);
  if (machine) {
    event = new Events(event);
    event._id = event.machineId + "_" + shortId.generate();
    // Telemetry belongs to the machine's shop, so a Shop Admin sees only
    // events from their own floor.
    event.shopId = machine.shopId ?? null;
    event.created = moment().utc().add(config.timeDifference, "hours");
    event = await event.save();

    // Device parameters(Lock Status, IR Status) Publish for Applications
    await socketServer.socketPublish({ type: "Events", data: event });

    if (event.type === "IR") {
      console.log("IR Event Received");

      await boxesRepo.updateFilledStatus(event);
    } else if (event.type === "LOCKER") {
      console.log("LOCKER Event Received");

      await boxesRepo.updateLockerStatus(event);

      // if control by Customer
      if (event.purchaseId) {
        console.log("event:", event);

        let purchase = await purchasesRepo.getById(event.purchaseId);
        console.log("purchase:", purchase);

        if (purchase) {
          let boxId = event.boxes[0];
          let split = boxId.split("_");
          let cabinNumber = split[0];
          let boxNumbers = split[1];

          if (event.machineType == "direct") {
            boxId = event.machineId + "_C" + cabinNumber + "_" + boxNumbers;
          } else {
            const includedBoxes = mapDecimalToBoxes(boxNumbers);
            includedBoxes.reverse();
            console.log("includedBoxes:", includedBoxes);
            boxId =
              event.machineId + "_C" + cabinNumber + "_" + includedBoxes[0];
          }

          console.log("boxId:", boxId);

          let items = purchase.items;
          console.log("before items:", items);

          let update = false;
          items.forEach((item, i) => {
            if (!item.boxStatus) update = true;

            if (item.boxId === boxId) {
              item.boxStatus = true;
              items[i] = item;
              return;
            }
          });

          let isCompleted = true;
          items.forEach((item) => {
            if (!item.boxStatus) isCompleted = false;
          });

          console.log("after items:", items);

          purchase = {
            items: items,
          };
          if (update) purchase.status = "Processing";

          if (isCompleted) {
            purchase.status = "Completed";
            await Promise.all(
              items.map(({ boxId }) =>
                boxesRepo.update(boxId, { productId: null })
              )
            );
          }

          console.log("purchase update:", purchase);

          await purchasesRepo.update(event.purchaseId, purchase);
        }
      }
    }
  } else console.log("Machine Not Found");

  // console.log('event:', event);
  return event;
};

function mapDecimalToBoxes(decimal) {
  const binaryString = (decimal >>> 0).toString(2);
  const includedBoxNumbers = [];
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === "1") {
      includedBoxNumbers.push(binaryString.length - i);
    }
  }
  return includedBoxNumbers;
}

/*
 * Control Machine.
 */
/* --------------------------------------------------------------- */
/* ---------------------------1-MQTT------------------------------ */
/* --------------------------------------------------------------- */
const control = async (event) => {
  const mqttRepo = require("../../services/mqtt");
  const topic_mqtt_send = "ControlRequest-" + event.machineId;
  await mqttRepo.sendToDevice(topic_mqtt_send, event);
};

/**
 * The single entry point for "open this locker".
 *
 * One handler for every role, because the two ways to earn the right are not
 * role-shaped: staff service the machines their scope covers, and a shopper
 * opens the box they paid for. The dispatcher used to pick a handler by role
 * name (`controlVendor`, `controlAdmin`, …), which silently had no answer for a
 * Super Admin or any dashboard-created role.
 */
const controlLocker = async (event, user) => {
  if (!event.machineId) return;
  const machine = await machinesRepo.getById(event.machineId, false, false);
  if (!machine) return;

  if (await canServiceMachine(user, machine)) {
    await control(event);
    return;
  }

  // Buyer OR a gift recipient (in gift.authorizedOpeners) may open the box.
  if (!event.purchaseId) return;
  const purchase = await purchasesRepo.getById(event.purchaseId);
  if (isPaidOpener(purchase, user)) await control(event);
};
/* --------------------------------------------------------------- */
/* ---------------------------0-Direct---------------------------- */
/* --------------------------------------------------------------- */
// Staff servicing the machine — no buyer path here: rebooting a device and
// writing direct telemetry are not things a shopper does.
const controlDirectMachine = async (event, user) => {
  if (!event.machineId) return;
  const machine = await machinesRepo.getById(event.machineId, false, false);
  if (!(await canServiceMachine(user, machine))) return;
  if (event.command == "reboot")
    return sendToBroker("device.reboot", { deviceId: machine.mac });
  await create({ ...event, machineType: "direct" }, machine);
};

/* --------------------------------------------------------------- */
/* ---------------------------2-Bluetooth1------------------------ */
/* --------------------------------------------------------------- */
const controlBluetooth1Machine = async (event, user) => {
  if (!event.machineId) return;
  const machine = await machinesRepo.getById(event.machineId, false, false);
  if (!machine) return;
  const purchase = event.purchaseId
    ? await purchasesRepo.getById(event.purchaseId)
    : null;
  const servicing = await canServiceMachine(user, machine);
  if (!servicing && !isPaidOpener(purchase, user)) return;

  // sent to broker and wait for response to create event
  sendToBroker("door.open", {
    deviceId: machine.mac,
    // A service opening has no order behind it, so it gets a synthetic id.
    orderId:
      event.purchaseId ||
      (servicing && `admin-${new Date().getTime().toString().slice(-5)}`),
    container: event.box[0],
    lane: event.box[1],
  });
};

/**
  event: {
    // machineId,
    purchaseId,
  }
 */
const bluetoothMachineComplete = async (event, user) => {
  // if (!event.machineId) return;
  // const machine = await machinesRepo.getById(event.machineId, false, false);
  const purchase = event.purchaseId
    ? await purchasesRepo.getById(event.purchaseId)
    : null;
  if (
    // machine &&
    purchase &&
    isAuthorizedOpener(purchase, user._id) &&
    ["PaymentDone", "Processing"].includes(purchase.status)
  ) {
    purchase.status = "Completed";
    await Promise.all(
      purchase.items.map(({ boxId }) =>
        boxesRepo.update(boxId, { productId: null })
      )
    );
    await purchasesRepo.update(event.purchaseId, purchase);
  }
};

/* --------------------------------------------------------------- */
/* ---------------------------3-kaisijin - Bluetooth 12------------------------ */
/* --------------------------------------------------------------- */
const bluetooth2MachineComplete = async (event, user) => {
  return bluetoothMachineComplete(event, user);
};

/* --------------------------------------------------------------- */
/* ---------------------------5-Bluetooth3------------------------ */
/* --------------------------------------------------------------- */
const bluetooth3MachineComplete = async (event, user) => {
  return bluetoothMachineComplete(event, user);
};

/* --------------------------------------------------------------- */
/* ---------------------------4-Bluetooth4------------------------ */
/* --------------------------------------------------------------- */
const bluetooth4MachineComplete = async (event, user) => {
  return bluetoothMachineComplete(event, user);
};

/* --------------------------------------------------------------- */
/* ---------------------------6-Bluetooth5------------------------ */
/* --------------------------------------------------------------- */
const bluetooth5MachineComplete = async (event, user) => {
  return bluetoothMachineComplete(event, user);
};

/*
 * Get last connectivity status of all Machines.
 */
let updateConnection = async (machineId, status) => {
  await machinesRepo.updateConnection(machineId, status);

  await sendToApplication({
    type: "Connections",
    data: [{ machineId: machineId, connected: status }],
  });
};

let sendToApplication = async (event) => {
  const socketServer = require("../../services/socket");
  // console.log('event:', event);
  await socketServer.socketPublish(event);
};

module.exports = {
  create,
  controlLocker,
  controlDirectMachine,
  updateConnection,
  controlBluetooth1Machine,
  bluetooth2MachineComplete,
  bluetooth3MachineComplete,
  bluetooth4MachineComplete,
  bluetooth5MachineComplete,
};
