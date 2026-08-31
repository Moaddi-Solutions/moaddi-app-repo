import moment = require('moment');
import shortId = require('shortid');
import type { Model } from 'mongoose';
import type ModelTypes = require('../models/types');
import { repoError } from '../../lib/errors';
import { vendorScopeOf } from '../../lib/ability';

const PlacementRequests = require('../models/placementRequests') as Model<ModelTypes.IPlacementRequest>;
const machinesRepo = require('./machines') as typeof import('./machines');
const shopsRepo = require('./shops') as typeof import('./shops');
const config: { timeDifference: number } = require('../../../config');

const now = () => moment().utc().add(config.timeDifference, 'hours').toDate();

interface CreateInput {
  shopId: string;
  machineId?: string | null;
  machineName?: string | null;
  machineMac?: string | null;
  notes?: string | null;
  /** Alias accepted from clients; stored as `notes`. */
  productType?: string | null;
}

const create = async (
  vendorId: string,
  input: CreateInput
): Promise<ModelTypes.IPlacementRequest> => {
  const shopId = String(input.shopId || '').trim();
  if (!shopId) throw repoError(400, 'shopId is required.');

  const shop = await shopsRepo.getById(shopId).catch(() => null);
  if (!shop || shop.isDeleted) throw repoError(404, 'Shop not found.');

  const machineId = input.machineId ? String(input.machineId).trim() : '';
  let machineName = input.machineName ? String(input.machineName).trim() : '';
  let machineMac = input.machineMac ? String(input.machineMac).trim() : '';
  const notesRaw = input.notes ?? input.productType;
  const notes = notesRaw != null && String(notesRaw).trim() !== '' ? String(notesRaw).trim() : null;

  if (!machineId && !machineName) {
    throw repoError(400, 'machineId or machineName is required.');
  }

  if (machineId) {
    const machine = await machinesRepo.getById(machineId, false, true);
    if (String(machine.vendorId) !== String(vendorId)) {
      throw repoError(403, 'Machine does not belong to this vendor.');
    }
    if (!machineName) machineName = machine.name || '';
    if (!machineMac) machineMac = machine.mac || '';

    const dup = await PlacementRequests.findOne({
      machineId,
      shopId,
      status: 'pending',
      isDeleted: { $ne: true },
    }).lean();
    if (dup) {
      throw repoError(409, 'A pending placement request already exists for this machine and shop.');
    }
  }

  const doc = new PlacementRequests({
    _id: 'pr_' + shortId.generate(),
    vendorId: String(vendorId),
    shopId,
    machineId: machineId || null,
    machineName: machineName || null,
    machineMac: machineMac || null,
    notes,
    status: 'pending',
    created: now(),
    isDeleted: false,
  });
  await doc.save();
  return doc.toJSON() as ModelTypes.IPlacementRequest;
};

const getById = async (id: string): Promise<ModelTypes.IPlacementRequest> => {
  const doc = await PlacementRequests.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw repoError(404, 'Placement request not found.');
  return doc.toJSON() as ModelTypes.IPlacementRequest;
};

interface ListFilter {
  vendorId?: string;
  shopId?: string | { $in: string[] };
  status?: ModelTypes.PlacementRequestStatus;
  isDeleted?: boolean | { $ne: boolean };
  [key: string]: unknown;
}

const list = async (
  filter: ListFilter = {},
  skip: number = 0,
  limit: number = 100
): Promise<{ data: ModelTypes.IPlacementRequest[]; total: number }> => {
  const query: Record<string, unknown> = { isDeleted: { $ne: true }, ...filter };
  const total = await PlacementRequests.countDocuments(query);
  const docs = await PlacementRequests.find(query)
    .sort({ created: -1 })
    .skip(parseInt(String(skip), 10) || 0)
    .limit(parseInt(String(limit), 10) || 100);
  return {
    data: docs.map((d) => d.toJSON() as ModelTypes.IPlacementRequest),
    total,
  };
};

/**
 * Approve or reject a pending request. On approve with machineId, assigns
 * the machine to the request's shop (shopId + isActive).
 */
const updateStatus = async (
  id: string,
  status: 'approved' | 'rejected',
  reviewerId: string
): Promise<ModelTypes.IPlacementRequest> => {
  if (status !== 'approved' && status !== 'rejected') {
    throw repoError(400, 'status must be approved or rejected.');
  }

  const existing = await getById(id);
  if (existing.status !== 'pending') {
    throw repoError(409, `Placement request is already ${existing.status}.`);
  }

  if (status === 'approved' && existing.machineId) {
    const machine = await machinesRepo.getById(existing.machineId, false, true);
    if (String(machine.vendorId) !== String(existing.vendorId)) {
      throw repoError(409, 'Machine no longer belongs to the requesting vendor.');
    }
    await machinesRepo.update(existing.machineId, {
      shopId: existing.shopId,
      isActive: true,
    });
  }

  const updated = await PlacementRequests.findOneAndUpdate(
    { _id: id, status: 'pending', isDeleted: { $ne: true } },
    {
      $set: {
        status,
        reviewedBy: String(reviewerId),
        reviewedAt: now(),
        updated: now(),
      },
    },
    { new: true }
  );
  if (!updated) {
    throw repoError(409, 'Placement request status changed concurrently.');
  }
  return updated.toJSON() as ModelTypes.IPlacementRequest;
};

/** Resolve which vendor id the caller acts as (self or tenant staff). */
const resolveVendorId = (user: { _id: string; role?: string; tenantId?: string | null; tenantRole?: string | null }): string => {
  const scope = vendorScopeOf(user as Parameters<typeof vendorScopeOf>[0]);
  if (scope.length === 0) throw repoError(403, 'Only vendors can create placement requests.');
  return scope[0];
};

export = { create, getById, list, updateStatus, resolveVendorId };
