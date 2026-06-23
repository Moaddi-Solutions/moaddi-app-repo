const moment = require("moment");
const jwt = require("jsonwebtoken");
const config = require("../../../config");
const Users = require("../models/users");
const machinesRepo = require("../../data/repos/machines");
const purchasesRepo = require("../../data/repos/purchases");
const {
  flattenProductForPreferredCurrency,
} = require("./product-pricing");

/** Flatten nested product prices on vendor machine boxes for API clients. */
const shapeVendorMachineBoxProducts = (user, preferredCurrency) => {
  if (!user?.machines?.length) return;
  const pref = String(
    preferredCurrency || user.preferredCurrency || "SAR",
  ).trim();
  for (const machine of user.machines) {
    if (!machine?.boxes?.length) continue;
    machine.boxes = machine.boxes.map((box) => ({
      ...box,
      product: box.product
        ? flattenProductForPreferredCurrency(box.product, pref)
        : box.product,
    }));
  }
};

const { sendWhatsAppMessage } = require("../../services/whatsapp");

let sendOTPViaWhatsapp = async ({ to, otp }) => {
  await sendWhatsAppMessage(to, `Your Moaddi OTP is ${otp}`);
};
/*
 * Signup new user.
 */
let signUp = async (user, preferredCurrency) => {
  delete user.confirm_password;
  if (!user.name) user.name = "user";
  user.otp = Math.floor(Math.random() * 9000) + 1000; // 4 digit number
  user.isActive = false;
  // Always store preferred currency resolved from geo-currency service.
  user.preferredCurrency =
    (typeof preferredCurrency === "string" && preferredCurrency.trim()) ||
    process.env.BASE_CURRENCY ||
    "SAR";

  user = new Users(user);

  if (user.role == "Customer") {
    user._id = user._id.toLowerCase();

    let User = await Users.findOne({ _id: user._id });

    // Return error if user already exists.
    if (User) {
      console.log("User already exists.", User);
      // await remove(user._id);
      return Promise.reject({
        message: "User already exists.",
        statusCode: 409,
      });
    }

    user.created = moment().utc().add(config.timeDifference, "hours");
    user.updated = moment().utc().add(config.timeDifference, "hours");
    user = await user.save();

    user = user.toJSON();
    delete user.password;
    console.log(user._id.split("+")[1],'user._id.split("+")[1]');
    await sendOTPViaWhatsapp({ to: user._id.split("+")[1], otp: user.otp });

    delete user.otp;
    return user;
  } else return { message: "User role is not valid" };
};

let otp = async ({ _id, otp }) => {
  let user = await Users.findOne({ _id });
  if (!user) {
    console.log("User does not exists.", user);
    return Promise.reject({
      message: "User does not exists.",
      statusCode: 409,
    });
  }
  if (user.otp == otp) {
    user.isActive = true;
    user = await user.save();
    user = user.toJSON();
    delete user.password;
    return user;
  } else {
    return Promise.reject({
      message: "Wrong OTP",
      statusCode: 409,
    });
  }
};

/*
 * Create new user.
 */
let create = async (user) => {
  delete user.confirm_password;
  user = new Users(user);

  if (user.role == "Vendor") {
    user._id = user._id.toLowerCase();

    let User = await Users.findOne({ _id: user._id });

    // Return error if user already exists.
    if (User) {
      console.log("User already exists.", User);
      return Promise.reject({
        message: "User already exists.",
        statusCode: 409,
      });
    }

    // Check if create user is Vendor and also request with assign machine
    if (user.role == "Vendor" && user.hasOwnProperty("machines")) {
      if (user.machines.length)
        await machinesRepo.assignBulk(user._id, user.machines);
    }

    user.created = moment().utc().add(config.timeDifference, "hours");
    user.updated = moment().utc().add(config.timeDifference, "hours");
    user = await user.save();

    user = user.toJSON();
    delete user.password;

    return user;
  } else return { message: "User role is not valid" };
};

/*
 * Signin user.
 * Reject if user is not verified.
 * Return jwt.
 */
let signIn = async (credentials) => {
  credentials._id = credentials._id.toLowerCase();
  console.log({ credentials });
  let user = await Users.findOne({ _id: credentials._id });

  // Return error if user not found.
  if (!user || user.isDeleted) {
    return Promise.reject({
      message: "User not found.",
      statusCode: 404,
    });
  }

  // Return error if credentials don't match.
  if (!user.checkPassword(credentials.password)) {
    return Promise.reject({
      message: "Invalid password.",
      statusCode: 401,
    });
  }

  if (!user.isActive) {
    return Promise.reject({
      // don't change the message
      message: "User not Active.",
      statusCode: 401,
    });
  }

  let expiresIn = config.jwt.expiry1;
  if (credentials.rememberMe) expiresIn = config.jwt.expiry2;

  // Create token.
  let token = jwt.sign(
    {
      _id: user._id,
      role: user.role,
    },
    config.jwt.secret,
    {
      expiresIn: expiresIn,
    },
  );

  return {
    _id: user._id,
    name: user.name,
    role: user.role,
    preferredCurrency: user.preferredCurrency || "SAR",
    token: token,
    expiresIn: expiresIn,
  };
};

/*
 * Get all users.
 */
let get = async (skip = 0, limit = 1000) => {
  let users = await Users.find({ isDeleted: false })
    .sort({ created: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  for (let i = 0; i < users.length; i++) {
    users[i] = users[i].toJSON();
    delete users[i].password;
  }
  return users;
};

let getByShopId = async (shopId) => {
  const total = await Users.countDocuments({ shopId, isDeleted: false });
  let vendors = await Users.find({ shopId, isDeleted: false });

  for (let i = 0; i < vendors.length; i++) {
    vendors[i] = vendors[i].toJSON();
    delete vendors[i].password;
  }

  // return vendors;
  return { data: vendors, total };
};

/*
 * Check user by userId for Token.
 */
let checkUser = async (userId) => {
  let user = await Users.findOne({ _id: userId });

  if (!user || user.isDeleted) {
    return Promise.reject({
      message: "User not found.",
      statusCode: 404,
    });
  }

  user = user.toJSON();
  delete user.password;
  return user;
};

/*
 * Get user by userId.
 */
let getById = async (userId, preferredCurrency) => {
  try {
    const pipeline = [
      {
        $match: { _id: userId, isDeleted: false },
      },
      {
        $addFields: { _id: userId },
      },
      {
        $addFields: {
          shopId: "$shopId",
        },
      },
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "vendorId",
          as: "machines",
        },
      },
      {
        $unwind: {
          path: "$machines",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          machines: {
            _id: "$machines._id",
            name: "$machines.name",
            mac: "$machines.mac",
            qrCode: "$machines.qrCode",
            isConnected: "$machines.isConnected",
            isAssigned: "$machines.isAssigned",
            isActive: "$machines.isActive",
            isDeleted: "$machines.isDeleted",
            created: "$machines.created",
            updated: "$machines.updated",
          },
        },
      },
      {
        $lookup: {
          from: "boxes",
          localField: "machines._id",
          foreignField: "machineId",
          as: "machines.boxes",
        },
      },
      {
        $unwind: {
          path: "$machines.boxes",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "machines.boxes.productId",
          foreignField: "_id",
          as: "machines.boxes.product",
        },
      },
      {
        $addFields: {
          "machines.boxes.product": {
            $cond: {
              if: { $isArray: "$machines.boxes.product" },
              then: { $arrayElemAt: ["$machines.boxes.product", 0] },
              else: null,
            },
          },
        },
      },
      {
        $sort: {
          "machines.boxes.cabinNumber": 1,
          "machines.boxes.boxNumber": 1,
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            shopId: "$shopId",
            name: "$name",
            role: "$role",
            preferredCurrency: "$preferredCurrency",
            isActive: "$isActive",
            isDeleted: "$isDeleted",
            created: "$created",
            updated: "$updated",
            machineId: "$machines._id",
            machineName: "$machines.name",
            machineMac: "$machines.mac",
            machineQrCode: "$machines.qrCode",
            machineIsConnected: "$machines.isConnected",
            machineIsAssigned: "$machines.isAssigned",
            machineIsActive: "$machines.isActive",
            machineIsDeleted: "$machines.isDeleted",
            machineCreated: "$machines.created",
            machineUpdated: "$machines.updated",
          },
          boxes: {
            $push: "$machines.boxes",
          },
        },
      },
      {
        $addFields: {
          boxes: {
            $map: {
              input: "$boxes",
              as: "box",
              in: {
                _id: "$$box._id",
                name: "$$box.name",
                cabinNumber: "$$box.cabinNumber",
                boxNumber: "$$box.boxNumber",
                machineId: "$$box.machineId",
                productId: "$$box.productId",
                status: "$$box.status",
                isFilled: "$$box.isFilled",
                isActive: "$$box.isActive",
                isDeleted: "$$box.isDeleted",
                created: "$$box.created",
                updated: "$$box.updated",
                product: "$$box.product",
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id._id",
          shopId: { $first: "$_id.shopId" },
          name: { $first: "$_id.name" },
          role: { $first: "$_id.role" },
          preferredCurrency: { $first: "$_id.preferredCurrency" },
          isActive: { $first: "$_id.isActive" },
          isDeleted: { $first: "$_id.isDeleted" },
          created: { $first: "$_id.created" },
          updated: { $first: "$_id.updated" },
          machines: {
            $push: {
              _id: "$_id.machineId",
              name: "$_id.machineName",
              mac: "$_id.machineMac",
              qrCode: "$_id.machineQrCode",
              isConnected: "$_id.machineIsConnected",
              isAssigned: "$_id.machineIsAssigned",
              isActive: "$_id.machineIsActive",
              isDeleted: "$_id.machineIsDeleted",
              created: "$_id.machineCreated",
              updated: "$_id.machineUpdated",
              boxes: "$boxes",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          shopId: 1,
          name: 1,
          role: 1,
          preferredCurrency: 1,
          isActive: 1,
          isDeleted: 1,
          created: 1,
          updated: 1,
          machines: {
            $cond: {
              if: { $ne: ["$machines", []] },
              then: {
                $map: {
                  input: "$machines",
                  as: "machine",
                  in: {
                    _id: "$$machine._id",
                    name: "$$machine.name",
                    mac: "$$machine.mac",
                    qrCode: "$$machine.qrCode",
                    isConnected: "$$machine.isConnected",
                    isAssigned: "$$machine.isAssigned",
                    isActive: "$$machine.isActive",
                    isDeleted: "$$machine.isDeleted",
                    created: "$$machine.created",
                    updated: "$$machine.updated",
                    boxes: "$$machine.boxes",
                  },
                },
              },
              else: [],
            },
          },
        },
      },
      {
        $sort: { created: -1 },
      },
    ];

    let user = await Users.aggregate(pipeline).exec();
    user = user[0];
    if (!user || user.isDeleted) {
      return Promise.reject({
        message: "User not found.",
        statusCode: 404,
      });
    }

    const roleNorm = String(user.role ?? "")
      .trim()
      .toLowerCase();
    if (roleNorm === "vendor") {
      if (!user.machines?.[0]?._id) user.machines = [];
      shapeVendorMachineBoxProducts(user, preferredCurrency);
    } else {
      delete user.machines;
      const purchase = await purchasesRepo.getByCustomerId(
        String(user._id),
        preferredCurrency,
      );
      if (purchase) user.purchase = purchase;
      else delete user.purchase;
    }
    return user;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

/*
 * Get all users by role.
 */
let getByRole = async (role, skip = 0, limit = 1000) => {
  const total = await Users.countDocuments({ isDeleted: false, role: role });

  try {
    const pipeline = [
      {
        $match: { isDeleted: false, role: role },
      },
      {
        $sort: { created: -1 },
      },
      {
        $skip: parseInt(skip),
      },
      {
        $limit: parseInt(limit),
      },
      {
        $addFields: { role: role },
      },
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "vendorId",
          as: "machines",
        },
      },
      {
        $unwind: {
          path: "$machines",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          machines: {
            _id: "$machines._id",
            name: "$machines.name",
          },
        },
      },
      {
        $lookup: {
          from: "boxes",
          localField: "machines._id",
          foreignField: "machineId",
          as: "machines.boxes",
        },
      },
      {
        $unwind: {
          path: "$machines.boxes",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "machines.boxes.productId",
          foreignField: "_id",
          as: "machines.boxes.product",
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            name: "$name",
            role: "$role",
            preferredCurrency: "$preferredCurrency",
            isActive: "$isActive",
            isDeleted: "$isDeleted",
            created: "$created",
            updated: "$updated",
            machineId: "$machines._id",
            machineName: "$machines.name",
            machineMac: "$machines.mac",
          },
          boxes: {
            $push: "$machines.boxes",
          },
        },
      },
      {
        $group: {
          _id: "$_id._id",
          name: { $first: "$_id.name" },
          role: { $first: "$_id.role" },
          preferredCurrency: { $first: "$_id.preferredCurrency" },
          isActive: { $first: "$_id.isActive" },
          isDeleted: { $first: "$_id.isDeleted" },
          created: { $first: "$_id.created" },
          updated: { $first: "$_id.updated" },
          machines: {
            $push: {
              _id: "$_id.machineId",
              name: "$_id.machineName",
              mac: "$_id.machineMac",
              boxes: "$boxes",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          role: 1,
          preferredCurrency: 1,
          isActive: 1,
          isDeleted: 1,
          created: 1,
          updated: 1,
          machines: 1,
        },
      },
      {
        $sort: { created: -1 },
      },
    ];

    const users = await Users.aggregate(pipeline).exec();
    if (role === "Vendor")
      users.forEach((e) => {
        if (!e.machines[0]._id) e.machines = [];
      });
    else
      users.forEach((e) => {
        if (!e.machines[0]._id) delete e.machines;
      });
    return { data: users, total };
    // return users
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

/*
 * Toggle user by id.
 * Toggle off means that the user is Inactive.
 */
let toggle = async (userId) => {
  let user = await Users.findOne({ _id: userId });

  if (!user || user.isDeleted) {
    return Promise.reject({
      message: "User not found.",
      statusCode: 404,
    });
  }

  // Update property.
  user.isActive = user.isActive == true ? false : true;
  user.updated = moment().utc().add(config.timeDifference, "hours");

  user = await user.save();
  user = user.toJSON();
  delete user.password;

  return user;
};

/*
 * Update user by id.
 */
let update = async (userId, properties) => {
  let user = await Users.findOne({ _id: userId });

  // Return error if user not found.
  if (!user || user.isDeleted) {
    console.log("User Not Found.", user);
    return Promise.reject({
      message: "User not found.",
      statusCode: 404,
    });
  }

  // Update all properties.
  for (let property in properties) {
    user[property] = properties[property];
  }

  user.updated = moment().utc().add(config.timeDifference, "hours");

  user = await user.save();
  user = user.toJSON();
  delete user.password;

  return user;
};

/*
 * Update user by id.
 */
let updateMachines = async (userId, machineId) => {
  let user = await Users.findOne({ _id: userId });
  console.log("User:", user);

  // Return error if user not found.
  if (!user || user.isDeleted) {
    console.log("User Not Found.", user);
    return Promise.reject({
      message: "User not found.",
      statusCode: 404,
    });
  }

  let temp = [];
  user.machines.forEach(async (machine) => {
    if (machine !== machineId) temp.push(machine);
  });
  user.machines = temp;
  user.updated = moment().utc().add(config.timeDifference, "hours");

  user = await user.save();
  user = user.toJSON();
  delete user.password;

  return user;
};

/*
 * Update user password by old and new password.
 */
let updatePassword = async (userId, properties) => {
  let user = await Users.findOne({ _id: userId });

  // Return error if user not found.
  if (!user || user.isDeleted) {
    console.log("User Not Found.", user);
    return Promise.reject({
      message: "User not found.",
      statusCode: 404,
    });
  }

  let isvalid = await user.checkPassword(properties.old);

  // Update all properties.
  if (isvalid) {
    user["password"] = properties["new"];
  } else {
    return Promise.reject({
      message: "old password not matched",
      statusCode: 401,
    });
  }

  user.updated = moment().utc().add(config.timeDifference, "hours");
  user = await user.save();
  user = user.toJSON();
  delete user.password;

  return user;
};

// /*
// * Create forgot password request by userId
// */
// let forgotPassword = async (userId) => {
//     let user = await Users.findOne({ _id: userId });
//     // Return error if user not found.
//     if (!user || user.isDeleted) {
//         return Promise.reject({
//             message: 'User not found.',
//             statusCode: 404
//         });
//     }

//     let me = await getMe(user._id, user.role);
//     let reset_password = {
//         _id: 'rp_' + user._id + '_' + shortId.generate(),
//         userId: user._id,
//         created: moment().utc().add(config.timeDifference, 'hours')
//     };
//     reset_password = new ResetPassword(reset_password);
//     reset_password = await reset_password.save();

//     if (me && (user.role === 'SubAdminPolice' || user.role === 'SubAdminDoctor')) {
//         // Send email to reset password
//         emailService.sendEmail({
//             bcc: me.information.email,
//             subject: 'Get Me A Docotor | Password Forget',
//             text: 'Please click on this link for reset password: ' + config.dashboard_host + '/#/user/resetpassword/' + reset_password._id
//         });
//     } else {
//         // Send email to reset password
//         emailService.sendEmail({
//             bcc: me.email,
//             subject: 'Get Me A Docotor | Password Forget',
//             text: 'Please click on this link for reset password: ' + config.dashboard_host + '/#/user/resetpassword/' + reset_password._id
//         });
//     }

//     let resp = { result: 'Your forgot password request created successfully.' };
//     return resp;
// }

// /*
// * Reset password verification by resetPasswordId.
// */
// let resetPassword = async (resetPasswordId) => {
//     let reset_password = await ResetPassword.findOne({ _id: resetPasswordId });
//     if (!reset_password) {
//         return Promise.reject({
//             message: 'Please reset again your password.',
//             statusCode: 404
//         });
//     }
//     return reset_password;
// }

// /*
// * Update password after verification by userId.
// */
// let setPassword = async (userId, properties) => {
//     let user = await Users.findOne({ _id: userId });

//     // Return error if user not found.
//     if (!user || user.isDeleted) {
//         return Promise.reject({
//             message: 'User not found.',
//             statusCode: 404
//         });
//     }
//     user['password'] = properties['new'];
//     user = await user.save();
//     user = user.toJSON();

//     delete user.password;

//     let reset_password = await ResetPassword.remove({ userId: userId });
//     return user;
// }

/*
 * Delete user by id.
 */
let remove = async (userId) => {
  // let user = update(userId, { isDeleted: true });
  let user = await Users.deleteOne({ _id: userId });

  // let user = update(userId, { isDeleted: true });

  return user;
};

module.exports = {
  signUp,
  create,
  signIn,
  toggle,
  get,
  getByShopId,
  checkUser,
  getById,
  getByRole,
  update,
  updateMachines,
  updatePassword,
  // forgotPassword,
  // resetPassword,
  // setPassword,
  remove,
  otp,
};
