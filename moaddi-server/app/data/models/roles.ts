import mongoose = require('mongoose');
import moment = require('moment');

const config: { timeDifference: number } = require('../../../config');

interface IRole {
  _id: string;
  name: string;
  label: string;
  description: string;
  builtIn: boolean;
  /** Custom roles only: rule rows ({action, subject, scope}) applied by the ability registry. */
  rules: unknown[];
  created: Date;
  updated?: Date;
}

/**
 * Reference data for the platform roles (Vendor / Shop Owner / Super Admin).
 * Permission RULES live in code (`app/lib/ability.ts`) — this collection
 * only records which roles exist, for admin UI and auditing.
 */
const RolesSchema = new mongoose.Schema<IRole>(
  {
    _id: { type: String, required: true },
    // The role's code, and always equal to `_id` — the repo writes both from
    // the same value, and every lookup (the ability registry, `users.role`,
    // the delete guard) keys off `_id`. Carried as its own field because it is
    // what the create API and the dashboard form send.
    //
    // Deliberately NOT unique: `_id` already guarantees that, and the index
    // here only ever fired on states the app cannot produce (two roles sharing
    // a name under different ids) while permitting the one that matters
    // (`_id` and `name` disagreeing). $indexStats recorded 0 uses of it.
    name: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, required: true },
    builtIn: { type: Boolean, default: true },
    rules: { type: [mongoose.Schema.Types.Mixed], default: [] },
    created: { type: Date, default: () => moment().utc().add(config.timeDifference, 'hours').toDate() },
    updated: { type: Date, required: false },
  },
  {
    _id: false,
    id: false,
    versionKey: false,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

export = mongoose.model<IRole>('roles', RolesSchema);
