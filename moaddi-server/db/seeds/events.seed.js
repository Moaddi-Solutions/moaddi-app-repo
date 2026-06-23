const Event = require("../../app/data/models/events");
const ids = require("./ids");

module.exports = async function seedEvents() {
  await Event.deleteMany({});

  await Event.insertMany([
    {
      _id: ids.events.ir,
      machineId: ids.machines.one,
      type: "IR",
      boxes: [1, 2, 3],
      value: 1,
    },
    {
      _id: ids.events.locker,
      machineId: ids.machines.one,
      type: "LOCKER",
      boxes: [ids.boxes.m1_1, ids.boxes.m1_2],
      value: 0,
    },
  ]);

  console.log("Seeded events: 2 (IR, LOCKER) on machine_001");
};
