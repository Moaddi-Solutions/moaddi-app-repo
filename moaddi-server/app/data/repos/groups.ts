import mongoose = require('mongoose');
import moment = require('moment');
import shortId = require('shortid');
import type { Model, PipelineStage, Types } from 'mongoose';
import type ModelTypes = require('../models/types');
import {
  flattenProductForPreferredCurrency,
  normCurrency,
} from './product-pricing';

const config: { timeDifference: number } = require('../../../config');
const Groups = require('../models/groups') as Model<ModelTypes.IGroup>;

type GroupIdCandidate = string | Types.ObjectId;
type MutableRecord = Record<string, unknown>;
type ProductRecord = Partial<ModelTypes.IProduct> & MutableRecord;
type BoxRecord = MutableRecord & { productId?: unknown; machineId?: unknown };
type MachineRecord = MutableRecord & { _id?: unknown; products?: unknown[]; boxes?: unknown[] };
type GroupAggregate = MutableRecord & {
  machines?: MachineRecord[];
  boxes?: BoxRecord[];
  products?: ProductRecord[];
};

const now = (): Date => moment().utc().add(config.timeDifference, 'hours').toDate();

const groupIdCandidates = (groupId: string): GroupIdCandidate[] => {
  const id = String(groupId);
  const candidates: GroupIdCandidate[] = [id];
  if (mongoose.Types.ObjectId.isValid(id)) {
    candidates.push(new mongoose.Types.ObjectId(id));
  }
  return candidates;
};

const groupIdMatch = (groupId: string): { _id: { $in: GroupIdCandidate[] } } => ({
  _id: { $in: groupIdCandidates(groupId) },
});

const create = async (
  group: Partial<ModelTypes.IGroup> & MutableRecord
): Promise<ModelTypes.IGroup> => {
  const doc = new Groups(group);
  doc._id = 'g_' + shortId.generate();
  doc.created = now();
  doc.updated = now();
  const saved = await doc.save();
  return saved.toJSON() as ModelTypes.IGroup;
};

const get = async (
  skip: number | string = 0,
  limit: number | string = 1000
): Promise<{ data: ModelTypes.IGroup[]; total: number }> => {
  const total = await Groups.countDocuments({});
  const groups = await Groups.find({})
    .sort({ created: -1 })
    .skip(parseInt(String(skip)))
    .limit(parseInt(String(limit)));

  return {
    data: groups.map((group) => group.toJSON() as ModelTypes.IGroup),
    total,
  };
};

const getById = async (
  groupId: string,
  preferredCurrency: string = 'SAR'
): Promise<MutableRecord | ModelTypes.IGroup> => {
  try {
    const pipeline: PipelineStage[] = [
      { $match: groupIdMatch(groupId) },
      {
        $lookup: {
          from: 'machines',
          foreignField: 'groupId',
          localField: '_id',
          as: 'machines',
        },
      },
      {
        $lookup: {
          from: 'boxes',
          foreignField: 'machineId',
          localField: 'machines._id',
          as: 'boxes',
        },
      },
      {
        $lookup: {
          from: 'products',
          foreignField: '_id',
          localField: 'boxes.productId',
          as: 'products',
        },
      },
      { $sort: { created: -1 as const } },
    ];

    const groups = await Groups.aggregate<GroupAggregate>(pipeline).exec();
    const group = groups[0];
    if (!group) {
      const doc = await Groups.findOne(groupIdMatch(groupId));
      if (!doc) {
        return Promise.reject({
          message: 'Group not found.',
          statusCode: 404,
        });
      }
      return doc.toJSON() as ModelTypes.IGroup;
    }

    const boxes = group.boxes ?? [];
    const products = group.products ?? [];
    const pref = normCurrency(preferredCurrency);

    group.machines = (group.machines ?? []).map((machine) => {
      const seenProductIds = new Set<unknown>();
      machine.products = [];
      machine.boxes = boxes.filter((box) => {
        if (
          box.productId &&
          box.machineId == machine._id &&
          !seenProductIds.has(box.productId)
        ) {
          seenProductIds.add(box.productId);
          const product = products.find((product) => product._id == box.productId);
          if (product) {
            machine.products?.push({
              ...flattenProductForPreferredCurrency(product, pref),
              boxes: boxes.filter(
                (box) => box.productId == product._id && box.machineId == machine._id
              ),
            });
          }
        }
        return box.machineId == machine._id;
      });
      return machine;
    });

    delete group.boxes;
    delete group.products;
    return group;
  } catch (error) {
    console.error('Error fetching group:', error);
    throw error;
  }
};

const update = async (
  groupId: string,
  properties: Partial<ModelTypes.IGroup> & MutableRecord
): Promise<ModelTypes.IGroup> => {
  const group = await Groups.findOne({ _id: groupId });

  if (!group) {
    return Promise.reject({
      message: 'Group not found.',
      statusCode: 404,
    });
  }

  for (const property in properties) {
    (group as unknown as MutableRecord)[property] = properties[property];
  }

  group.updated = now();

  const saved = await group.save();
  return saved.toJSON() as ModelTypes.IGroup;
};

const remove = async (groupId: string): Promise<{ deletedCount?: number }> => {
  return Groups.deleteOne({ _id: groupId });
};

export = {
  create,
  get,
  getById,
  update,
  remove,
};
