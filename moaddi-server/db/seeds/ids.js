const { Types } = require("mongoose");

const oid = (value) => new Types.ObjectId(value);

/**
 * Stable IDs for seed documents — keep FK references in sync across seed files.
 * Note: Models use String IDs, so Mongoose will cast these ObjectIds to hex strings.
 */
module.exports = {
  users: {
    admin: "+966555728085",
    vendor: "+966555728086",
    vendorOsamah: "+966504369794",
    vendorAhmedV1: "+966555728081",
    vendorAhmedV2: "+966555728082",
    customer: "+966562773199",
    vendorDirect: "+966566728075",
    vendorRabie: "+201020363217",
  },
  groups: {
    main: oid("64e222222222222222222221"),
    secondary: oid("64e222222222222222222222"),
  },
  shops: {
    main: oid("64e333333333333333333331"),
    branch: oid("64e333333333333333333332"),
  },
  products: {
    water: oid("64e444444444444444444441"),
    snack: oid("64e444444444444444444442"),
    energy: oid("64e444444444444444444443"),
  },
  machines: {
    one: oid("64e555555555555555555551"),
    two: oid("64e555555555555555555552"),
  },
  boxes: {
    m1_1: oid("64e666666666666666666661"),
    m1_2: oid("64e666666666666666666662"),
    m1_3: oid("64e666666666666666666663"),
    m2_1: oid("64e666666666666666666664"),
    m2_2: oid("64e666666666666666666665"),
  },
  purchases: {
    completed: oid("64e777777777777777777771"),
    paymentDone: oid("64e777777777777777777772"),
  },
  events: {
    ir: oid("64e888888888888888888881"),
    locker: oid("64e888888888888888888882"),
  },
};
