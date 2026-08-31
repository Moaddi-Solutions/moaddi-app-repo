const Machines = require("../models/machines");
const Purchases = require("../models/purchases");
const Transactions = require("../models/transactions");
const { accessibleFilter } = require("../../lib/accessibleFilter");
const money = require("../../lib/money");
const { effectiveCommissionPercent } = require("../../lib/shopScope");

const PAID_STATUSES = ["Paid", "Processing", "Completed"];

/**
 * Revenue + shop commission per machine the caller may see on the floor.
 * `update Machine` / `update Box` for vendors & fillers; shop-scoped
 * `read Machine` for ShopOwner (not catalog read — that would be every
 * machine on the platform). Optional `shopId` narrows further.
 */
const getRevenueByMachine = async (ability, { shopId } = {}) => {
  const {
    accessibleFilterAny,
    accessibleScopedFilter,
  } = require("../../lib/accessibleFilter");
  const scope = accessibleFilterAny(
    accessibleFilter(ability, "update", "Machine"),
    accessibleScopedFilter(ability, "read", "Machine"),
    accessibleFilter(ability, "update", "Box"),
  );
  const match = {
    isDeleted: { $ne: true },
    ...scope,
  };
  if (shopId) match.shopId = String(shopId);

  const machines = await Machines.find(match)
    .select("_id name shopId vendorId commissionPercent isActive isConnected")
    .lean();

  if (!machines.length) {
    return { data: [], total: 0 };
  }

  const machineIds = machines.map((m) => String(m._id));

  const [sales, commissions] = await Promise.all([
    Purchases.aggregate([
      {
        $match: {
          machineId: { $in: machineIds },
          status: { $in: PAID_STATUSES },
        },
      },
      {
        $group: {
          _id: "$machineId",
          grossSales: { $sum: "$price" },
          purchaseCount: { $sum: 1 },
        },
      },
    ]),
    Transactions.aggregate([
      { $match: { kind: "commission" } },
      {
        $project: {
          slices: { $ifNull: ["$metadata.slices", []] },
        },
      },
      { $unwind: "$slices" },
      {
        $match: {
          "slices.machineId": { $in: machineIds },
        },
      },
      {
        $group: {
          _id: "$slices.machineId",
          commissionEarned: { $sum: "$slices.commissionAmount" },
        },
      },
    ]),
  ]);

  const salesById = new Map(sales.map((r) => [String(r._id), r]));
  const commissionById = new Map(commissions.map((r) => [String(r._id), r]));

  let data = machines.map((m) => {
    const id = String(m._id);
    const s = salesById.get(id);
    const c = commissionById.get(id);
    const commissionPercent =
      m.commissionPercent != null ? money.toNumber(m.commissionPercent) : null;
    return {
      machineId: id,
      name: m.name,
      shopId: m.shopId ?? null,
      vendorId: m.vendorId ?? null,
      commissionPercent,
      isActive: m.isActive !== false,
      isConnected: !!m.isConnected,
      grossSales: s ? Number(s.grossSales) || 0 : 0,
      purchaseCount: s ? Number(s.purchaseCount) || 0 : 0,
      commissionEarned: c ? Number(c.commissionEarned) || 0 : 0,
    };
  });

  data.sort((a, b) => b.grossSales - a.grossSales);

  data = await Promise.all(
    data.map(async (row) => ({
      ...row,
      effectiveCommissionPercent: await effectiveCommissionPercent(row.machineId),
    })),
  );

  return { data, total: data.length };
};

module.exports = { getRevenueByMachine };
