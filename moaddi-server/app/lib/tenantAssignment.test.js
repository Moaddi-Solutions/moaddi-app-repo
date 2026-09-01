const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeSupportAssignments,
} = require("./tenantAssignment");

describe("normalizeSupportAssignments", () => {
  it("returns [] for null / undefined / empty", async () => {
    assert.deepEqual(await normalizeSupportAssignments(null, "t1"), []);
    assert.deepEqual(await normalizeSupportAssignments(undefined, "t1"), []);
    assert.deepEqual(await normalizeSupportAssignments([], "t1"), []);
  });

  it("rejects non-arrays", async () => {
    await assert.rejects(
      () => normalizeSupportAssignments({ audience: "all" }, "t1"),
      /must be an array/,
    );
  });

  it("rejects missing tenant when rows are present", async () => {
    await assert.rejects(
      () =>
        normalizeSupportAssignments(
          [{ audience: "all", userId: "u1" }],
          null,
        ),
      /tenant owner/,
    );
  });

  it("rejects unknown audience before hitting the database", async () => {
    await assert.rejects(
      () =>
        normalizeSupportAssignments(
          [{ audience: "everyone", userId: "u1" }],
          "tenant1",
        ),
      /Unknown support audience/,
    );
  });

  it("rejects duplicate audiences", async () => {
    await assert.rejects(
      () =>
        normalizeSupportAssignments(
          [
            { audience: "customers", userId: "u1" },
            { audience: "customers", userId: "u2" },
          ],
          "tenant1",
        ),
      /Duplicate support audience/,
    );
  });

  it("rejects empty userId", async () => {
    await assert.rejects(
      () =>
        normalizeSupportAssignments(
          [{ audience: "all", userId: "  " }],
          "tenant1",
        ),
      /needs a userId/,
    );
  });
});
