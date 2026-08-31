/**
 * Pick Contact assignee from audience-keyed supportAssignments.
 * Prefer a specific audience row, else the `all` fallback lane.
 * Legacy: when assignments are empty, treat supportUserId as `all`.
 */
const pickFromAssignments = (assignments, audience, legacySupportUserId) => {
  const rows = Array.isArray(assignments) ? assignments : [];
  if (rows.length) {
    const specific = rows.find((r) => r?.audience === audience);
    if (specific?.userId) return String(specific.userId);
    const all = rows.find((r) => r?.audience === "all");
    if (all?.userId) return String(all.userId);
    return null;
  }
  if (legacySupportUserId) return String(legacySupportUserId);
  return null;
};

module.exports = {
  pickFromAssignments,
};
