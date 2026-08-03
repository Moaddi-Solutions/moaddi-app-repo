/**
 * Read-only rendering of a role's CASL rules (computed server-side from
 * app/lib/ability.ts). Rules are not editable here — they live in code.
 */
const asList = (v) => (Array.isArray(v) ? v : [v]).filter(Boolean);

const scopeLabel = (conditions) => {
  if (!conditions) return "All records";
  if (conditions.vendorId) return "Own records (as supplier)";
  if (conditions.customerId) return "Own records (as shopper)";
  if (conditions._id) return "Own account";
  return "Restricted";
};

const RulesTable = ({ rules }) => {
  if (!Array.isArray(rules) || rules.length === 0) {
    return (
      <p className="text-sm font-semibold text-muted-foreground">
        This role has no permissions.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left">
            <th className="px-3 py-2 font-extrabold">Actions</th>
            <th className="px-3 py-2 font-extrabold">Subjects</th>
            <th className="px-3 py-2 font-extrabold">Scope</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, i) => (
            <tr key={i} className="border-b border-border last:border-b-0">
              <td className="px-3 py-2 font-semibold capitalize">
                {asList(rule.action).join(", ")}
              </td>
              <td className="px-3 py-2">
                {asList(rule.subject)
                  .map((s) => (s === "all" ? "Everything" : s))
                  .join(", ")}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {scopeLabel(rule.conditions)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RulesTable;
