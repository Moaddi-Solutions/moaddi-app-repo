const crypto = require("crypto");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const config = require("../../../config");
const Users = require("../models/users");
const { rulesFor, isCustomRole } = require("../../lib/ability");
const {
  ROLES,
  SUPPORT_AUDIENCES,
  directorySubjectForRoleParam,
  isSupportAudience,
  isInternalStaffRole,
} = require("../../lib/roles");
const { accessibleFilter, isDenyAll } = require("../../lib/accessibleFilter");
const Purchases = require("../models/purchases");
const Wallets = require("../models/wallets");
const Withdrawals = require("../models/withdrawals");
const Transactions = require("../models/transactions");
const machinesRepo = require("../../data/repos/machines");
const Machines = require("../models/machines");
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
    // Merge any guest purchases made with this phone into the now-active account.
    await mergeGuestPurchases(user._id);
    return user;
  } else {
    return Promise.reject({
      message: "Wrong OTP",
      statusCode: 409,
    });
  }
};

/*
 * Normalize a phone number to the same shape used for user `_id`
 * (lowercased, trimmed). Guest `phone` is stored this way so it can be
 * matched against a real account's `_id` on merge.
 */
let normalizePhone = (phone) => String(phone || "").trim().toLowerCase();

/* E.164: leading + then 8–15 digits (first digit non-zero). */
let isValidE164 = (phone) => /^\+[1-9]\d{7,14}$/.test(normalizePhone(phone));

const { PURCHASE_STATUS } = require("../../payment/constants");
/* Only purchases the guest actually paid for are worth merging — this also
 * blocks history-pollution via an unverified guest phone (abandoned/pending
 * guest carts never attach to a real account). */
const MERGEABLE_STATUSES = [
  PURCHASE_STATUS.PAYMENT_DONE,
  PURCHASE_STATUS.PROCESSING,
  PURCHASE_STATUS.COMPLETED,
];

/*
 * Create a guest session user.
 * Guests get a synthetic `_id` (the phone can't be the id — a later real
 * signup with that phone would collide), a random password (schema requires
 * one), role "Guest", and a JWT so every existing authenticated endpoint
 * (purchases, payment, boxes, sockets) works unchanged.
 */
let createGuest = async (preferredCurrency) => {
  let guest = new Users({
    _id: "guest-" + crypto.randomUUID(),
    name: "Guest",
    role: "Guest",
    password: crypto.randomBytes(24).toString("hex"),
    isActive: true,
    isGuest: true,
    preferredCurrency:
      (typeof preferredCurrency === "string" && preferredCurrency.trim()) ||
      process.env.BASE_CURRENCY ||
      "SAR",
    created: moment().utc().add(config.timeDifference, "hours"),
    updated: moment().utc().add(config.timeDifference, "hours"),
  });
  guest = await guest.save();
  guest = guest.toJSON();

  let expiresIn = config.jwt.expiry2 || config.jwt.expiry1;
  let token = jwt.sign(
    { _id: guest._id, role: guest.role },
    config.jwt.secret,
    { expiresIn },
  );

  return {
    _id: guest._id,
    name: guest.name,
    role: guest.role,
    rules: rulesFor(guest),
    preferredCurrency: guest.preferredCurrency || "SAR",
    isGuest: true,
    token,
    expiresIn,
  };
};

/*
 * Save contact info collected from a guest at checkout.
 * Phone is required (used later for merge-by-phone); name/email optional.
 */
let updateGuestInfo = async (guestId, { phone, name, email }) => {
  let user = await Users.findOne({ _id: guestId });
  if (!user || user.isDeleted || user.role !== "Guest") {
    return Promise.reject({ message: "Guest not found.", statusCode: 404 });
  }
  if (!phone || !isValidE164(phone)) {
    return Promise.reject({
      message: "A valid phone number is required.",
      statusCode: 400,
    });
  }
  user.phone = normalizePhone(phone);
  if (name) user.name = name;
  if (email) user.email = email;
  user.updated = moment().utc().add(config.timeDifference, "hours");
  user = await user.save();
  user = user.toJSON();
  delete user.password;
  return user;
};

/*
 * Register a device's Expo push token against this account.
 *
 * `$addToSet`, not `$push`: the app re-registers on every sign-in (the token
 * belongs to the device, and who is signed in on it can change), so this has to
 * be idempotent. `$push` would accumulate a duplicate per sign-in and Expo would
 * then be sent the same notification once per copy.
 */
let addPushToken = async (userId, expoPushToken) => {
  await Users.updateOne(
    { _id: userId },
    { $addToSet: { expoPushTokens: expoPushToken } },
  );
};

/*
 * Detach a device's push token — called on sign-out, so the next person to sign
 * in on that phone does not keep receiving the previous account's chat pushes.
 */
let removePushToken = async (userId, expoPushToken) => {
  await Users.updateOne(
    { _id: userId },
    { $pull: { expoPushTokens: expoPushToken } },
  );
};

/*
 * Reassign guest purchases to a real account, then soft-delete the guest
 * records. Matched by phone: a real user's `_id` IS their phone number, and a
 * guest's `phone` is stored normalized to the same shape.
 */
let mergeGuestPurchases = async (realUserId) => {
  const phone = normalizePhone(realUserId);
  if (!phone) return;
  const guests = await Users.find({
    role: "Guest",
    phone,
    isDeleted: { $ne: true },
  });
  if (!guests.length) return;
  const guestIds = guests.map((g) => g._id);
  // Only reassign PAID purchases — unverified guest phones can't pollute a real
  // account's history with abandoned/pending carts.
  await Purchases.updateMany(
    { customerId: { $in: guestIds }, status: { $in: MERGEABLE_STATUSES } },
    { $set: { customerId: realUserId } },
  );
  await Users.updateMany(
    { _id: { $in: guestIds } },
    { $set: { isDeleted: true, updated: moment().utc().add(config.timeDifference, "hours") } },
  );
  console.log(`Merged ${guestIds.length} guest(s) into ${realUserId}`);
};

/*
 * Sign in (or transparently sign up) via a social provider.
 *
 * `profile` is the normalized, already-verified payload from
 * services/social-auth.js: { provider, sub, email, name, emailVerified }.
 *
 * Social users mirror the guest pattern: a synthetic `_id`
 * (`<provider>-<sub>`) so they need no phone number, a random password
 * (schema requires one, never used for login), role "Customer", active
 * immediately. Returns the same shape as `signIn` (with a JWT).
 */
let socialSignIn = async (profile, preferredCurrency) => {
  const provider = String(profile.provider || "").toLowerCase();
  if (!provider || !profile.sub) {
    return Promise.reject({
      message: "Invalid social profile.",
      statusCode: 400,
    });
  }

  const _id = `${provider}-${profile.sub}`;
  const currency =
    (typeof preferredCurrency === "string" && preferredCurrency.trim()) ||
    process.env.BASE_CURRENCY ||
    "SAR";

  let user = await Users.findOne({ _id });

  if (user && user.isDeleted) {
    return Promise.reject({
      message: "This account has been deactivated.",
      statusCode: 403,
    });
  }

  if (user && !user.isActive) {
    return Promise.reject({
      message: "User not Active.",
      statusCode: 401,
    });
  }

  if (!user) {
    user = new Users({
      _id,
      name: profile.name || "user",
      role: "Customer",
      password: crypto.randomBytes(24).toString("hex"),
      email: profile.email || undefined,
      provider,
      providerId: profile.sub,
      isActive: true,
      preferredCurrency: currency,
      created: moment().utc().add(config.timeDifference, "hours"),
      updated: moment().utc().add(config.timeDifference, "hours"),
    });
    user = await user.save();
  } else {
    // Keep name/email fresh from the provider on subsequent logins.
    let dirty = false;
    if (profile.email && user.email !== profile.email) {
      user.email = profile.email;
      dirty = true;
    }
    if (profile.name && (!user.name || user.name === "user")) {
      user.name = profile.name;
      dirty = true;
    }
    if (dirty) {
      user.updated = moment().utc().add(config.timeDifference, "hours");
      user = await user.save();
    }
  }

  user = user.toJSON();

  // NOTE: guest-purchase merge is phone-based and keyed on `_id === phone`;
  // social users have no phone at creation, so there is nothing to merge yet.
  // When phone-linking is added, merge by the linked phone into this `_id`.

  let expiresIn = config.jwt.expiry2 || config.jwt.expiry1;
  let token = jwt.sign(
    { _id: user._id, role: user.role },
    config.jwt.secret,
    { expiresIn },
  );

  return {
    _id: user._id,
    name: user.name,
    role: user.role,
    rules: rulesFor(user),
    email: user.email || "",
    provider,
    preferredCurrency: user.preferredCurrency || "SAR",
    token,
    expiresIn,
  };
};

/**
 * Validates `supportAudiences` and enforces one agent per audience.
 *
 * Called from both `create` and `update` rather than from the controller,
 * because every write path routes through here — a check in one controller
 * would leave the other able to hand the same audience to two people, and the
 * `/chat/support-target` lookup would then pick between them arbitrarily.
 *
 * `userId` is excluded from the conflict search so re-saving an agent keeps
 * the audiences it already holds.
 *
 * `role` is the account's role *after* this write applies. Only the internal
 * roster (SuperAdmin, Support, custom-role Staff) may hold an audience —
 * `defineAbilityFor` only grants the matching directory read from the Support
 * and custom-role branches, so a Customer, Vendor, or ShopOwner holding one
 * would become a `/chat/support-target` routing destination with no way to
 * read the people it's supposed to answer.
 */
let assertSupportAudiences = async (userId, audiences, role) => {
  if (audiences == null) return undefined;
  if (!Array.isArray(audiences)) {
    return Promise.reject({
      message: "supportAudiences must be an array.",
      statusCode: 400,
    });
  }

  const cleaned = [...new Set(audiences.map((a) => String(a)))];
  const unknown = cleaned.find((a) => !isSupportAudience(a));
  if (unknown) {
    return Promise.reject({
      message: `Unknown support audience "${unknown}". Expected one of: ${SUPPORT_AUDIENCES.join(", ")}.`,
      statusCode: 400,
    });
  }
  if (!cleaned.length) return [];

  if (!isInternalStaffRole(role)) {
    return Promise.reject({
      message: "Only Super Admin, Support, or a custom-role staff account may hold support audiences.",
      statusCode: 400,
    });
  }

  const conflict = await Users.findOne({
    _id: { $ne: String(userId).toLowerCase() },
    isDeleted: false,
    supportAudiences: { $in: cleaned },
  }).lean();

  if (conflict) {
    const taken = cleaned.filter((a) =>
      (conflict.supportAudiences || []).includes(a),
    );
    return Promise.reject({
      message: `${conflict.name || conflict._id} already answers ${taken.join(", ")}. Remove it from them first.`,
      statusCode: 409,
    });
  }

  return cleaned;
};

/**
 * Admin GET often returns `machines` as populated objects; PUT echoes them
 * back. Sync helpers need bare ids — `[object Object]` would 404 as
 * "Machine not found."
 */
const coerceIdList = (raw) => {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((item) => {
          if (item == null) return "";
          if (typeof item === "string" || typeof item === "number") {
            return String(item).trim();
          }
          if (typeof item === "object") {
            return String(item._id ?? item.id ?? "").trim();
          }
          return "";
        })
        .filter(Boolean),
    ),
  ];
};

/*
 * Create new user.
 */
let create = async (user) => {
  delete user.confirm_password;
  const machineIds = Array.isArray(user.machines)
    ? coerceIdList(user.machines)
    : undefined;
  delete user.machines;
  // Supplier assignment is separate from vendor ownership — never route
  // through syncVendorMachines or it would steal the machine from its vendor.
  const supplierMachineIds = Array.isArray(user.supplierMachineIds)
    ? coerceIdList(user.supplierMachineIds)
    : undefined;
  delete user.supplierMachineIds;
  user = new Users(user);

  // Staff accounts only: built-in staff roles or a dashboard-created custom
  // role. (Customers sign themselves up; the role-grant checks live in the
  // controller.)
  const role = String(user.role || "");
  const creatable =
    role === "Vendor" ||
    role === "ShopOwner" ||
    role === "SuperAdmin" ||
    role === ROLES.SUPPORT ||
    isCustomRole(role);
  if (!creatable) {
    return Promise.reject({
      message: "User role is not valid",
      statusCode: 400,
    });
  }

  user._id = user._id.toLowerCase();

  const audiences = await assertSupportAudiences(user._id, user.supportAudiences, role);
  if (audiences !== undefined) user.supportAudiences = audiences;

  let User = await Users.findOne({ _id: user._id });

  // Return error if user already exists.
  if (User) {
    console.log("User already exists.", User);
    return Promise.reject({
      message: "User already exists.",
      statusCode: 409,
    });
  }

  user.created = moment().utc().add(config.timeDifference, "hours");
  user.updated = moment().utc().add(config.timeDifference, "hours");
  user = await user.save();

  if (machineIds !== undefined) {
    if (role === "Vendor") {
      await machinesRepo.syncVendorMachines(user._id, machineIds);
    }
  }
  if (supplierMachineIds !== undefined) {
    await machinesRepo.syncSupplierMachines(user._id, supplierMachineIds);
  }

  user = user.toJSON();
  delete user.password;

  return user;
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

  // Merge any guest purchases made with this phone into the account.
  await mergeGuestPurchases(user._id);

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
    rules: rulesFor(user),
    preferredCurrency: user.preferredCurrency || "SAR",
    token: token,
    expiresIn: expiresIn,
  };
};

/*
 * Get all users.
 */
let get = async (skip = 0, limit = 1000, ability = null) => {
  // "Staff I administer" — scoped by the update rule, so a Shop Admin sees the
  // roster of their own shops rather than the whole platform.
  const scope = ability ? accessibleFilter(ability, "update", "User") : {};
  let users = await Users.find({ ...scope, isDeleted: false })
    .sort({ created: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  for (let i = 0; i < users.length; i++) {
    users[i] = users[i].toJSON();
    delete users[i].password;
  }
  return users;
};

/**
 * Staff working in one shop.
 *
 * `scope` is the caller's CASL row filter. Without it this route returned every
 * staff record of any shop to anyone who asked — it ran with no session at all,
 * so a shop id was the only thing needed to enumerate the people in it.
 */
let getByShopId = async (shopId, scope = {}) => {
  const requested = { shopId, isDeleted: false };
  const query =
    scope && Object.keys(scope).length ? { $and: [scope, requested] } : requested;
  const total = await Users.countDocuments(query);
  let vendors = await Users.find(query);

  for (let i = 0; i < vendors.length; i++) {
    vendors[i] = vendors[i].toJSON();
    delete vendors[i].password;
  }

  // return vendors;
  return { data: vendors, total };
};

/**
 * Pull shop ids out of a CASL → Mongo filter (`{ shopId: { $in } }` or `$or`).
 */
const shopIdsFromScope = (scope) => {
  if (!scope || typeof scope !== "object") return null;
  if (scope.shopId && Array.isArray(scope.shopId.$in)) {
    return scope.shopId.$in.map(String).filter(Boolean);
  }
  if (typeof scope.shopId === "string" && scope.shopId) {
    return [String(scope.shopId)];
  }
  if (Array.isArray(scope.$or)) {
    const ids = [];
    for (const branch of scope.$or) {
      const nested = shopIdsFromScope(branch);
      if (nested) ids.push(...nested);
    }
    return ids.length ? [...new Set(ids)] : null;
  }
  return null;
};

/**
 * Vendors who own at least one (non-deleted) machine in the given shops.
 * Shop Admins reach the Vendors directory this way — Vendor user docs do not
 * store `shopId`.
 */
let listVendorsInShops = async (shopIds, skip = 0, limit = 1000) => {
  const shops = (shopIds || []).map(String).filter(Boolean);
  if (!shops.length) return { data: [], total: 0 };

  const vendorIds = await Machines.distinct("vendorId", {
    shopId: { $in: shops },
    isDeleted: { $ne: true },
    vendorId: { $nin: [null, ""] },
  });
  const ids = vendorIds.map(String).filter(Boolean);
  if (!ids.length) return { data: [], total: 0 };

  const match = {
    _id: { $in: ids },
    role: "Vendor",
    isDeleted: false,
  };
  const total = await Users.countDocuments(match);

  const pipeline = [
    { $match: match },
    { $sort: { created: -1 } },
    { $skip: parseInt(skip, 10) || 0 },
    { $limit: parseInt(limit, 10) || 1000 },
    {
      $lookup: {
        from: "machines",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$isDeleted", true] },
                  { $eq: ["$vendorId", "$$uid"] },
                  { $in: ["$shopId", shops] },
                ],
              },
            },
          },
          { $project: { _id: 1, name: 1 } },
        ],
        as: "machines",
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
        supportAudiences: 1,
        created: 1,
        updated: 1,
        machines: 1,
      },
    },
  ];

  const users = await Users.aggregate(pipeline).exec();
  users.forEach((e) => {
    if (!e.machines?.length) e.machines = [];
  });
  return { data: users, total };
};

/**
 * Distinct customers who bought in the given shops. Shop Admins reach the
 * Customers directory this way — Customer user docs do not store `shopId`.
 */
let listCustomersInShops = async (shopIds, skip = 0, limit = 1000) => {
  const shops = (shopIds || []).map(String).filter(Boolean);
  if (!shops.length) return { data: [], total: 0 };

  const customerIds = await Purchases.distinct("customerId", {
    shopId: { $in: shops },
    customerId: { $nin: [null, ""] },
  });
  const ids = customerIds.map(String).filter(Boolean);
  if (!ids.length) return { data: [], total: 0 };

  const match = {
    _id: { $in: ids },
    role: { $in: ["Customer", "customer", "Guest", "guest"] },
    isDeleted: false,
  };
  const total = await Users.countDocuments(match);

  const pipeline = [
    { $match: match },
    { $sort: { created: -1 } },
    { $skip: parseInt(skip, 10) || 0 },
    { $limit: parseInt(limit, 10) || 1000 },
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
      },
    },
  ];

  const users = await Users.aggregate(pipeline).exec();
  return { data: users, total };
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
            supportAudiences: "$supportAudiences",
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
          supportAudiences: { $first: "$_id.supportAudiences" },
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
          supportAudiences: 1,
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
      // Vendors own machines via vendorId — not supplierIds. Omitting this
      // field stops admin password/edit PUTs from calling syncSupplierMachines.
    } else {
      delete user.machines;
      const purchase = await purchasesRepo.getByCustomerId(
        String(user._id),
        preferredCurrency,
      );
      if (purchase) user.purchase = purchase;
      else delete user.purchase;

      const assigned = await Machines.find({
        supplierIds: String(user._id),
        isDeleted: { $ne: true },
      })
        .select("_id")
        .lean();
      user.supplierMachineIds = assigned.map((m) => String(m._id));
    }

    return user;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

const CUSTOMER_LIKE_ROLES = ["Customer", "Guest", "customer", "guest"];

/**
 * Every role defined in code. Both casings, because `users.role` is a free-form
 * String and the stored casing has drifted historically.
 */
const BUILT_IN_ROLES = [...Object.values(ROLES), "Guest"].flatMap((r) => [
  r,
  r.toLowerCase(),
]);

/**
 * Roles that run their own separate shop-level operation, so they sit outside
 * the SuperAdmin's internal roster — see the `"team"` pseudo-role below.
 */
const SHOP_LEVEL_ROLES = [ROLES.SHOP_OWNER, ROLES.VENDOR].flatMap((r) => [
  r,
  r.toLowerCase(),
]);

/*
 * Get all users by role. Three pseudo-roles:
 *   "staff"  — every non-customer/guest account (Vendor, ShopOwner, SuperAdmin
 *              and dashboard-created custom roles).
 *   "custom" — only dashboard-created custom roles (Support, Accountant, …),
 *              i.e. everything that is not a built-in. Backs the Staff page.
 *   "team"   — the SuperAdmin's internal roster: SuperAdmin, Support, and
 *              custom roles, but not ShopOwner/Vendor (they run their own
 *              shop, out of scope for internal staff-to-staff messaging).
 *              Backs the Team directory.
 */
let getByRole = async (role, skip = 0, limit = 1000, ability = null) => {
  const asked = String(role || "").toLowerCase();
  const isStaffList = asked === "staff";
  const isCustomList = asked === "custom";
  const isTeamList = asked === "team";
  // Filter on `read` against this directory's own subject. It used to be
  // `update` on `User`, which stood in for "is a manager" — that quietly
  // excluded any read-only role (a support agent matched only themselves), and
  // `User` could not tell the four directories apart anyway.
  const scope = ability
    ? accessibleFilter(ability, "read", directorySubjectForRoleParam(role))
    : {};

  // Shop Admin Vendor directory: Vendor accounts have no shopId — resolve
  // owners via machines installed in the caller's shops.
  if (asked === "vendor") {
    const shopIds = shopIdsFromScope(scope);
    if (shopIds?.length) {
      return listVendorsInShops(shopIds, skip, limit);
    }
  }

  // Shop Admin Customers directory: Customer accounts have no shopId — resolve
  // buyers via Purchases in the caller's shops. Triggered when Customer read is
  // DENY_ALL, or when it is only shop-scoped (would match zero user docs).
  if (asked === "customer" && ability) {
    const customerScope = scope;
    const shopFromCustomer = shopIdsFromScope(customerScope);
    if (isDenyAll(customerScope) || shopFromCustomer?.length) {
      let shopIds = shopFromCustomer;
      if (!shopIds?.length) {
        shopIds =
          shopIdsFromScope(accessibleFilter(ability, "update", "Purchase")) ||
          shopIdsFromScope(accessibleFilter(ability, "manage", "Purchase")) ||
          shopIdsFromScope(accessibleFilter(ability, "read", "Purchase"));
      }
      if (shopIds?.length) {
        return listCustomersInShops(shopIds, skip, limit);
      }
    }
  }

  const match = isStaffList
    ? { ...scope, isDeleted: false, role: { $nin: CUSTOMER_LIKE_ROLES } }
    : isCustomList
      ? { ...scope, isDeleted: false, role: { $nin: BUILT_IN_ROLES } }
      : isTeamList
        ? { ...scope, isDeleted: false, role: { $nin: [...CUSTOMER_LIKE_ROLES, ...SHOP_LEVEL_ROLES] } }
        : { ...scope, isDeleted: false, role: role };
  const total = await Users.countDocuments(match);

  try {
    const pipeline = [
      {
        $match: match,
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
        $lookup: {
          from: "machines",
          let: { uid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ["$isDeleted", true] },
                    { $eq: ["$vendorId", "$$uid"] },
                  ],
                },
              },
            },
          ],
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
            supportAudiences: "$supportAudiences",
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
          supportAudiences: { $first: "$_id.supportAudiences" },
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
          supportAudiences: 1,
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
    users.forEach((e) => {
      const isVendor =
        String(e.role ?? "").toLowerCase() === "vendor" || role === "Vendor";
      if (!e.machines?.[0]?._id) {
        if (isVendor || isStaffList || isCustomList || isTeamList) e.machines = [];
        else delete e.machines;
      }
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

  const previousShopId = user.shopId ?? null;
  const machineIds = Object.prototype.hasOwnProperty.call(properties, "machines")
    ? coerceIdList(properties.machines)
    : undefined;
  const supplierMachineIds = Object.prototype.hasOwnProperty.call(
    properties,
    "supplierMachineIds",
  )
    ? coerceIdList(properties.supplierMachineIds)
    : undefined;
  const nextProps = { ...properties };
  delete nextProps.machines;
  delete nextProps.supplierMachineIds;
  delete nextProps.confirm_password;

  if (Object.prototype.hasOwnProperty.call(nextProps, "supportAudiences")) {
    // The role this write leaves the account with — a request may change role
    // and supportAudiences in the same PUT, so the stored role alone is not
    // always the right one to check against.
    const effectiveRole = nextProps.role ?? user.role;
    nextProps.supportAudiences = await assertSupportAudiences(
      userId,
      nextProps.supportAudiences,
      effectiveRole,
    );
  }

  // Update all properties.
  for (let property in nextProps) {
    user[property] = nextProps[property];
  }

  user.updated = moment().utc().add(config.timeDifference, "hours");

  user = await user.save();
  user = user.toJSON();
  delete user.password;

  // Moving a vendor between shops has to carry their records with them, or
  // the denormalized shopId columns that authorization reads go stale and the
  // new Shop Admin sees nothing while the old one still does.
  const nextShopId = user.shopId ?? null;
  if (nextShopId !== previousShopId) {
    await recascadeVendorShop(user._id, nextShopId);
  }

  if (machineIds !== undefined) {
    const role = String(user.role || "");
    if (role === "Vendor") {
      await machinesRepo.syncVendorMachines(user._id, machineIds);
    }
  }
  // Only custom-role staff (tenantId set) get supplier machine sync. Built-in
  // Vendor PUT may still echo an empty supplierMachineIds from older clients.
  if (supplierMachineIds !== undefined && user.tenantId) {
    await machinesRepo.syncSupplierMachines(user._id, supplierMachineIds);
  }

  return user;
};

/**
 * Re-stamps every record denormalized from a vendor's shop. Safe to call for
 * non-vendors — they simply own none of these rows.
 */
let recascadeVendorShop = async (vendorId, shopId) => {
  const productsRepo = require("./products");
  const next = shopId ? String(shopId) : null;
  const owned = { vendorId: String(vendorId) };

  await Promise.all([
    productsRepo.reshop(vendorId, next),
    Wallets.updateMany(owned, { $set: { shopId: next } }),
    Withdrawals.updateMany(owned, { $set: { shopId: next } }),
    Transactions.updateMany(owned, { $set: { shopId: next } }),
  ]);
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

/**
 * The active support agent answering one audience, or null when nobody holds
 * it (the caller then falls back to `findSuperAdmin` below).
 *
 * Not filtered by role: a support agent is either a `Support` account or a
 * custom-role Staff member holding the audience — `assertSupportAudiences`
 * already guarantees at most one active holder platform-wide, whatever role
 * they carry.
 *
 * Inactive and deleted agents are skipped deliberately: they cannot sign in,
 * so returning one would route customers into an inbox nobody reads.
 */
let findSupportAgent = async (audience) => {
  if (!isSupportAudience(audience)) return null;
  return Users.findOne({
    supportAudiences: audience,
    isActive: true,
    isDeleted: false,
  }).lean();
};

/**
 * The platform's Super Admin — the ultimate fallback for "contact support"
 * when no agent holds the caller's audience. The product only ever has one,
 * so this is the id to use instead of a hardcoded/env-configured one; if that
 * ever changes, `sort({created: 1})` picks the original account rather than
 * an arbitrary one.
 */
let findSuperAdmin = async () => {
  return Users.findOne({
    role: ROLES.SUPER_ADMIN,
    isActive: true,
    isDeleted: false,
  })
    .sort({ created: 1 })
    .lean();
};

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
  createGuest,
  updateGuestInfo,
  addPushToken,
  removePushToken,
  mergeGuestPurchases,
  signIn,
  socialSignIn,
  toggle,
  get,
  getByShopId,
  listVendorsInShops,
  listCustomersInShops,
  checkUser,
  getById,
  getByRole,
  update,
  findSupportAgent,
  findSuperAdmin,
  recascadeVendorShop,
  updateMachines,
  updatePassword,
  // forgotPassword,
  // resetPassword,
  // setPassword,
  remove,
  otp,
};
