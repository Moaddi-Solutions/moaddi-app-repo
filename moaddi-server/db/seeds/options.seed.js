const moment = require("moment");
const Options = require("../../app/data/models/options");
const config = require("../../config");
const money = require("../../app/lib/money");
const { PAYMENT_PROVIDER } = require("../../app/payment/constants");
const ids = require("./ids");

const PLATFORM_ID = "platform";

module.exports = async function seedOptions() {
  await Options.deleteOne({ _id: PLATFORM_ID });

  await Options.create({
    _id: PLATFORM_ID,
    platformFeePercent: money.fromNumber(5),
    currency: "USD",
    paymentProviders: {
      [PAYMENT_PROVIDER.MYFATOORA]: { isActive: true },
      [PAYMENT_PROVIDER.STRIPE]: { isActive: true },
      [PAYMENT_PROVIDER.MOYASAR]: { isActive: true },
    },
    updatedBy: ids.users.admin,
    updated: moment().utc().add(config.timeDifference, "hours").toDate(),
  });

  console.log(
    "Seeded platform options: fee 5%, USD, payment providers myfatoora/stripe/moyasar active"
  );
};
