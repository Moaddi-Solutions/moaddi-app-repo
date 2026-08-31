const ability = require("./app/lib/ability");
console.log("exports", Object.keys(ability).sort().join(", "));

const {
  setCustomRoles,
  defineAbilityFor,
  rulesFor,
  isCustomRole,
} = ability;

setCustomRoles([
  {
    name: "vendor1__Supplier",
    rules: [{ action: "update", subject: "Box", scope: "assigned-machine" }],
  },
]);

const user = { _id: "s1", role: "vendor1__Supplier" };
console.log("isCustomRole", isCustomRole?.(user.role));
const a = defineAbilityFor(user);
console.log("can update Box", a.can("update", "Box"));
console.log("can update Machine", a.can("update", "Machine"));
console.log("canStaff", a.can("update", "Machine") || a.can("update", "Box"));
console.log("rules", JSON.stringify(rulesFor(user), null, 2));
