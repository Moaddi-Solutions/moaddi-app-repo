const express = require("express");
const shops = require("../../data/repos/shops");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const optionalAuthenticate = require("../middlewares/optionalAuthenticate");
const { getCurrencyOfUser } = require("../../services/geo-currency");
const upload = require("../middlewares/fileHandler");
const { subject } = require("../../lib/ability");

/**
 * `authorize()` only proves the role has a Shop rule at all. A Shop Admin's
 * rule is scoped to their own shops, so the target shop has to be checked too.
 */
const assertCanTouchShop = (req, res, action, shopId) => {
  if (req.ability.cannot(action, subject("Shop", { _id: String(shopId) }))) {
    res.status(403).json({ message: "Forbidden." });
    return false;
  }
  return true;
};

module.exports = () => {
  let router = express.Router();

  //create new shop
  router.post(
    "/shops",
    authenticate(),
    authorize("create", "Shop"),
    upload.files().single("image"),
    async (req, res, next) => {
      try {
        let results = await shops.create(
          JSON.parse(req.body.data),
          req.file,
          req.authenticatedUser._id
        );
        return res.status(201).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  // Staff shop directory — scoped to the shops the caller administers, so a
  // Shop Admin sees their own shops rather than the whole platform. The public
  // storefront listing is `/shops-active`, which stays open.
  router.get("/shops", authenticate(), authorize("read", "Shop"), async (req, res, next) => {
    try {
      let results = await shops.get(req.query.offset, req.query.limit, req.ability);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  //get all active shops
  router.get(
    "/shops-active" /*, authenticate()*/,
    optionalAuthenticate(),
    async (req, res, next) => {
    try {
      const preferredCurrency = await getCurrencyOfUser(req);
      let results = await shops.getActive(
        req.query.offset,
        req.query.limit,
        JSON.parse(req.query.filter ?? "{}"),
        preferredCurrency,
      );
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
    },
  );

  //get shop by id
  router.get("/shops/:shopId", authenticate(), authorize("read", "Shop"), async (req, res, next) => {
    try {
      if (!assertCanTouchShop(req, res, "read", req.params.shopId)) return;
      const preferredCurrency = await getCurrencyOfUser(req);
      let results = await shops.getById(req.params.shopId, preferredCurrency);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  //get shop by vendor id
  router.get(
    "/shops/vendor/:vendorId",
    authenticate(),
    authorize("read", "Shop"),
    async (req, res, next) => {
      try {
        let results = await shops.getByVendor(req.params.vendorId);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  // Update shop by shopId.
  router.put(
    "/shops/:shopId",
    authenticate(),
    authorize("update", "Shop"),
    upload.files().single("image"),
    async (req, res, next) => {
      try {
        console.log(req.params.shopId, JSON.parse(req.body.data), req.file);

        if (!assertCanTouchShop(req, res, "update", req.params.shopId)) return;
        let results = await shops.update(
          req.params.shopId,
          JSON.parse(req.body.data),
          req.file
        );
        return res.status(200).json(results);
      } catch (err) {
        console.log(err);

        next(err);
      }
    }
  );

  // delete shop by shopId.
  router.delete("/shops/:shopId", authenticate(), authorize("delete", "Shop"), async (req, res, next) => {
    try {
      if (!assertCanTouchShop(req, res, "delete", req.params.shopId)) return;
      let results = await shops.remove(req.params.shopId);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
