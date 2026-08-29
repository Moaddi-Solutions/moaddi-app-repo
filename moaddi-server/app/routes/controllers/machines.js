const express = require("express");
const machines = require("../../data/repos/machines");
const Machines = require("../../data/models/machines");
const authenticate = require("../middlewares/authenticate");
const optionalAuthenticate = require("../middlewares/optionalAuthenticate");
const authorize = require("../middlewares/authorize");
const { subject } = require("../../lib/ability");
const { accessibleFilter } = require("../../lib/accessibleFilter");
const { ownersOfMachine } = require("../../lib/shopScope");

/**
 * 403 unless the caller may `action` this machine. Owner columns are needed:
 * a vendor's rule matches on `vendorId`, and a shop admin's on `shopId`.
 */
const assertCanTouchMachine = async (req, res, action, machineId) => {
  const owners = await ownersOfMachine(machineId);
  if (req.ability.cannot(action, subject("Machine", owners))) {
    res.status(403).json({ message: "Forbidden." });
    return false;
  }
  return true;
};

/**
 * Who a machine belongs to — not editable through a general update.
 *
 * Reassigning is a platform act: it moves a machine between vendors, shops or
 * groups. `/assign` guards it by asking for rights over an *unassigned*
 * machine, which vendor- and shop-scoped rules can never match. The general
 * update route ran no such check, and `machines.update` copies the whole body
 * — so a vendor editing their own machine could post a different `vendorId`
 * and hand it to someone else, bypassing the very guard `/assign` exists for.
 */
const OWNERSHIP_FIELDS = ["vendorId", "shopId", "groupId"];

/** Same predicate `/assign` uses: only an unscoped machine-update reassigns. */
const canReassignMachine = (req) =>
  req.ability.can("update", subject("Machine", { vendorId: null }));

/**
 * 403 when the body would change an ownership field and the caller may not
 * reassign. Compared against the stored machine so a form that submits the
 * whole record — the dashboard's does — is not blocked by fields it merely
 * echoed back unchanged.
 */
const assertCanReassign = async (req, res, machineId) => {
  const touched = OWNERSHIP_FIELDS.filter((f) =>
    Object.prototype.hasOwnProperty.call(req.body || {}, f),
  );
  if (!touched.length || canReassignMachine(req)) return true;

  // `getById` shapes and joins; this only needs the raw owner columns.
  const current = await Machines.findOne({ _id: String(machineId) })
    .select(OWNERSHIP_FIELDS.join(" "))
    .lean();
  const same = (a, b) => String(a ?? "") === String(b ?? "");
  const changed = touched.filter((f) => !same(req.body[f], current?.[f]));
  if (!changed.length) {
    // Echoed unchanged — drop them so nothing downstream can rewrite them.
    for (const f of touched) delete req.body[f];
    return true;
  }

  res.status(403).json({
    message: `Only an administrator can reassign a machine (${changed.join(", ")}).`,
  });
  return false;
};
const { getCurrencyOfUser } = require("../../services/geo-currency");

module.exports = () => {
  let router = express.Router();

  //create new machine
  router.post("/machines", authenticate(), authorize("create", "Machine"), async (req, res, next) => {
    try {
      let results = await machines.create(req.body);
      return res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  });

  //get all machines
  router.get("/machines", authenticate(), authorize("read", "Machine"), async (req, res, next) => {
    try {
      let results = await machines.get(
        req.query.offset,
        req.query.limit,
        req.ability,
      );
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  //get all machines which are not assigned to any vendor.
  router.get("/machines/all", authenticate(), authorize("read", "Machine"), async (req, res, next) => {
    try {
      let results = await machines.getAllNotAssigned(
        req.query.offset,
        req.query.limit,
      );
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  //get active machines (public, optional user context)
  router.get(
    "/machines/active",
    optionalAuthenticate(),
    async (req, res, next) => {
      try {
        let results = await machines.getActive(
          req.query.offset,
          req.query.limit,
        );
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  //get machine by id
  router.get("/machines/:machineId", authenticate(), authorize("read", "Machine"), async (req, res, next) => {
    try {
      const getBoxes = req.query.getBoxes !== "false";
      let results = await machines.getById(req.params.machineId, getBoxes);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  //get machine by id
  router.get(
    "/machines/qrcode/:qrCode",
    // authenticate(),
    optionalAuthenticate(),
    async (req, res, next) => {
      try {
        const preferredCurrency = await getCurrencyOfUser(req);
        console.log("preferredCurrency:", preferredCurrency);
        console.log("qrCode:", req.params.qrCode);
        let results = await machines.getByQrCode(req.params.qrCode, preferredCurrency);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  //get all machines by vendorId
  router.get(
    "/machines/vendor/:vendorId",
    /* authenticate(), */ optionalAuthenticate(),
    async (req, res, next) => {
      try {
        const preferredCurrency = await getCurrencyOfUser(req);
        let results = await machines.getByVendorId(
          req.params.vendorId,
          preferredCurrency,
        );
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  //get all machines by productId
  router.get(
    "/machine/product/:productId",
    /* authenticate(), */ async (req, res, next) => {
      try {
        let results = await machines.getByProductId(req.params.productId);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  //get all machines by shopId
  router.get(
    "/machine/shop/:shopId",
    /* authenticate(), */ optionalAuthenticate(),
    async (req, res, next) => {
      const preferredCurrency = await getCurrencyOfUser(req);
      try {
        let results = await machines.getByShopId(
          req.params.shopId,
          req.query.offset,
          req.query.limit,
          preferredCurrency,
        );
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  //get all machines by groupId
  router.get(
    "/machine/group/:groupId",
    /* authenticate(), */ optionalAuthenticate(),
    async (req, res, next) => {
      try {
        const preferredCurrency = await getCurrencyOfUser(req);
        let results = await machines.getByGroupId(
          req.params.groupId,
          req.query.offset,
          req.query.limit,
          preferredCurrency,
        );
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  //get all machines by shopId and vendorId
  // Staff listing: the machines one supplier keeps in one shop. Scoped to the
  // caller, not to the vendor named in the path.
  router.get(
    "/machine/shop/:shopId/vendor/:vendorId",
    authenticate(),
    authorize("read", "Machine"),
    async (req, res, next) => {
      try {
        const preferredCurrency = await getCurrencyOfUser(req);
        let results = await machines.getByShopIdVendorId(
          req.params.shopId,
          req.params.vendorId,
          req.query.offset,
          req.query.limit,
          preferredCurrency,
          accessibleFilter(req.ability, "update", "Machine"),
        );
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );
  // Toggle machine by machineId.
  router.put(
    "/machines/:machineId/toggle",
    authenticate(),
    authorize("update", "Machine"),
    async (req, res, next) => {
      try {
        if (!(await assertCanTouchMachine(req, res, "update", req.params.machineId))) return;
        let results = await machines.toggle(req.params.machineId);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  // Update machine by machineId.
  router.put("/machines/:machineId", authenticate(), authorize("update", "Machine"), async (req, res, next) => {
    try {
      if (!(await assertCanTouchMachine(req, res, "update", req.params.machineId))) return;
      if (!(await assertCanReassign(req, res, req.params.machineId))) return;
      let results = await machines.update(req.params.machineId, req.body);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Assign machine to vendor.
  router.put(
    "/machines/:machineId/assign",
    authenticate(),
    authorize("update", "Machine"),
    async (req, res, next) => {
      try {
        // Assignment moves machines between vendors — requires rights over
        // unassigned machines, which vendor-scoped rules never grant.
        if (req.ability.cannot("update", subject("Machine", { vendorId: null }))) {
          return res.status(403).json({ message: "Forbidden." });
        }
        let results = await machines.assign(req.params.machineId, req.body);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  // Assign machine to vendor.
  router.put(
    "/machines/:machineId/unassign",
    authenticate(),
    authorize("update", "Machine"),
    async (req, res, next) => {
      try {
        if (!(await assertCanTouchMachine(req, res, "update", req.params.machineId))) return;
        let results = await machines.unassign(req.params.machineId, req.body);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  // Assign machines to vendor.
  router.put(
    "/machines/vendor/:vendorId/assign",
    authenticate(),
    authorize("update", "Machine"),
    async (req, res, next) => {
      try {
        if (req.ability.cannot("update", subject("Machine", { vendorId: null }))) {
          return res.status(403).json({ message: "Forbidden." });
        }
        let results = await machines.assignBulk(req.params.vendorId, req.body);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  // delete machine by machineId.
  router.delete(
    "/machines/:machineId",
    authenticate(),
    authorize("delete", "Machine"),
    async (req, res, next) => {
      try {
        if (!(await assertCanTouchMachine(req, res, "delete", req.params.machineId))) return;
        let results = await machines.remove(req.params.machineId);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
};
