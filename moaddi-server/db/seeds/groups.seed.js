const Group = require("../../app/data/models/groups");
const ids = require("./ids");

const SEED_GROUPS = [
  { _id: String(ids.groups.main), name: "Main Group" },
  { _id: String(ids.groups.secondary), name: "Secondary Group" },
];

module.exports = async function seedGroups() {
  await Group.deleteMany({});

  await Group.insertMany(SEED_GROUPS);

  console.log("Seeded groups: 2");
};

/** Upsert seed groups without deleting existing rows. */
module.exports.ensureSeedGroups = async function ensureSeedGroups() {
  const moment = require("moment");
  const config = require("../../config");
  const now = moment().utc().add(config.timeDifference, "hours").toDate();
  let created = 0;

  for (const group of SEED_GROUPS) {
    const result = await Group.updateOne(
      { _id: group._id },
      {
        $setOnInsert: { _id: group._id, created: now },
        $set: { name: group.name, updated: now },
      },
      { upsert: true },
    );
    if (result.upsertedCount) created += 1;
  }

  if (created > 0) {
    console.log(`ensureSeedGroups: created ${created} missing group(s)`);
  }
};
