const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { pickFromAssignments } = require("./supportTarget");

describe("pickFromAssignments", () => {
  it("prefers specific audience over all", () => {
    assert.equal(
      pickFromAssignments(
        [
          { audience: "all", userId: "fallback" },
          { audience: "customers", userId: "cust" },
        ],
        "customers",
      ),
      "cust",
    );
  });

  it("falls back to all when specific missing", () => {
    assert.equal(
      pickFromAssignments(
        [{ audience: "all", userId: "fallback" }],
        "vendors",
      ),
      "fallback",
    );
  });

  it("uses legacy supportUserId when assignments empty", () => {
    assert.equal(pickFromAssignments([], "customers", "legacy"), "legacy");
    assert.equal(pickFromAssignments(null, "customers", "legacy"), "legacy");
  });

  it("returns null when nothing matches", () => {
    assert.equal(pickFromAssignments([], "customers"), null);
    assert.equal(
      pickFromAssignments([{ audience: "vendors", userId: "v" }], "customers"),
      null,
    );
  });
});
