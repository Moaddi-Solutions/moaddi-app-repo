const express = require("express");
const machines = require("../../data/repos/machines");
const rolesRepo = require("../../data/repos/roles");
const authenticate = require("../middlewares/authenticate");
const optionalAuthenticate = require("../middlewares/optionalAuthenticate");
const authorize = require("../middlewares/authorize");
const { subject, defineAbilityFor } = require("../../lib/ability");
const {
  accessibleFilter,
  accessibleScopedFilter,
  isDenyAll,
} = require("../../lib/accessibleFilter");
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
 * Staff directory / fill view: manage the machine, fill its boxes
 * (`update Box` + assigned-machine), or shop-scoped `read Machine`
 * (ShopOwner floor view). Catalog `read Machine` alone is not enough
 * (every shopper has it) — accessibleScopedFilter drops unrestricted `{}`.
 */
const canStaffListMachines = (ability) => {
  if (ability.can("update", "Machine") || ability.can("update", "Box")) {
    return true;
  }
  const readScope = accessibleScopedFilter(ability, "read", "Machine");
  return !isDenyAll(readScope);
};

/**
 * Custom-role rules live in an in-memory registry primed at boot. If that
 * prime raced Mongo (or a role was created on another instance), a supplier
 * can have `update Box` in their login payload while this process still
 * builds an empty ability — and GET /machines 403s. Re-prime once, then
 * rebuild `req.ability` before denying.
 */
const ensureStaffMachineAccess = async (req) => {
  if (canStaffListMachines(req.ability)) return true;
  try {
    await rolesRepo.primeCustomRoles();
  } catch (_) {
    /* keep the ability we have */
  }
  const user = req.authenticatedUser || req.user;
  if (user) req.ability = defineAbilityFor(user);
  return canStaffListMachines(req.ability);
};

const assertCanViewMachine = async (req, res, machineId) => {
  const owners = await ownersOfMachine(machineId);
  // CASL's `subject()` casts the object in place — never reuse the same
  // plain object as Machine and Box or it throws on the second cast.
  const canSee = (ability) => {
    const base = {
      shopId: owners.shopId,
      vendorId: owners.vendorId,
      supplierIds: [...(owners.supplierIds || [])],
    };
    return (
      ability.can("update", subject("Machine", { ...base })) ||
      ability.can("read", subject("Machine", { ...base })) ||
      ability.can("update", subject("Box", { ...base }))
    );
  };
  if (!canSee(req.ability)) {
    // Same registry race as the list gate — refresh once before denying.
    try {
      await rolesRepo.primeCustomRoles();
    } catch (_) {
      /* ignore */
    }
    const user = req.authenticatedUser || req.user;
    if (user) req.ability = defineAbilityFor(user);
    if (!canSee(req.ability)) {
      res.status(403).json({ message: "Forbidden." });
      return false;
    }
  }
  return true;
};

/**
 * Active/inactive toggle: owners (`update Machine`) or assigned fill staff
 * (`update Box`). Fill requires the machine off — suppliers must be able to
 * flip it without getting full machine edit.
 */
const assertCanToggleMachine = async (req, res, machineId) => {
  const owners = await ownersOfMachine(machineId);
  const base = {
    shopId: owners.shopId,
    vendorId: owners.vendorId,
    supplierIds: [...(owners.supplierIds || [])],
  };
  const allowed =
    req.ability.can("update", subject("Machine", { ...base })) ||
    req.ability.can("update", subject("Box", { ...base }));
  if (!allowed) {
    res.status(403).json({ message: "Forbidden." });
    return false;
  }
  return true;
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

  // Staff machine directory — Vendor (`update Machine`), supplier fill
  // (`update Box`), or ShopOwner shop-scoped `read Machine`. Not catalog
  // `read Machine` (too wide).
  router.get("/machines", authenticate(), authorize.withAbility(), async (req, res, next) => {
    try {
      if (!(await ensureStaffMachineAccess(req))) {
        return res.status(403).json({ message: "Forbidden." });
      }
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

  // Per-machine gross sales + shop commission (management-scoped).
  // Authorize with `update Machine` — catalog `read` is unrestricted and would
  // let any signed-in staff list every machine's revenue.
  router.get(
    "/machines/revenue",
    authenticate(),
    authorize("update", "Machine"),
    async (req, res, next) => {
      try {
        const machineRevenue = require("../../data/repos/machineRevenue");
        const results = await machineRevenue.getRevenueByMachine(req.ability, {
          shopId: req.query.shopId || null,
        });
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  // Machine detail (with boxes for Fill). Suppliers need this without
  // `read Machine` — they hold `update Box` on assigned machines only.
  router.get("/machines/:machineId", authenticate(), authorize.withAbility(), async (req, res, next) => {
    try {
      if (!(await assertCanViewMachine(req, res, req.params.machineId))) return;
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
  // Vendors/admins: `update Machine`. Assigned suppliers: `update Box`
  // (fill workflow needs the machine inactive).
  router.put(
    "/machines/:machineId/toggle",
    authenticate(),
    authorize.withAbility(),
    async (req, res, next) => {
      try {
        if (!(await assertCanToggleMachine(req, res, req.params.machineId))) return;
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
