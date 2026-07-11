const express = require("express");
const machines = require("../../data/repos/machines");
const authenticate = require("../middlewares/authenticate");
const optionalAuthenticate = require("../middlewares/optionalAuthenticate");
const { getCurrencyOfUser } = require("../../services/geo-currency");

module.exports = () => {
  let router = express.Router();

  //create new machine
  router.post("/machines", authenticate(), async (req, res, next) => {
    try {
      let results = await machines.create(req.body);
      return res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  });

  //get all machines
  router.get("/machines", authenticate(), async (req, res, next) => {
    try {
      let results = await machines.get(
        req.query.offset,
        req.query.limit,
        req.authenticatedUser,
      );
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  //get all machines which are not assigned to any vendor.
  router.get("/machines/all", authenticate(), async (req, res, next) => {
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
  router.get("/machines/:machineId", authenticate(), async (req, res, next) => {
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
  router.get(
    "/machine/shop/:shopId/vendor/:vendorId",
    /* authenticate(), */ optionalAuthenticate(),
    async (req, res, next) => {
      try {
        const preferredCurrency = await getCurrencyOfUser(req);
        let results = await machines.getByShopIdVendorId(
          req.params.shopId,
          req.params.vendorId,
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
  // Toggle machine by machineId.
  router.put(
    "/machines/:machineId/toggle",
    authenticate(),
    async (req, res, next) => {
      try {
        let results = await machines.toggle(req.params.machineId);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  // Update machine by machineId.
  router.put("/machines/:machineId", authenticate(), async (req, res, next) => {
    try {
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
    async (req, res, next) => {
      try {
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
    async (req, res, next) => {
      try {
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
    async (req, res, next) => {
      try {
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
    async (req, res, next) => {
      try {
        let results = await machines.remove(req.params.machineId);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
};
