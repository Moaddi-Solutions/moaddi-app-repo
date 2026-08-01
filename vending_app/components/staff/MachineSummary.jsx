import React, { useMemo } from "react";
import { View } from "react-native";
import { Text } from "~/components/ui/text";
import { cn } from "~/lib/utils";

// Spec: "Fill — how many locks have product inside it". Assigning a product goes
// through fillProductInBox, which sets productId but never isFilled; isFilled only
// flips on an IR sensor event. Counting isFilled alone therefore reads 0 on a fully
// stocked machine whose IR path isn't reporting, so a box counts as filled when
// either source says it holds product.
const isBoxFilled = (box) => box.isFilled || !!box.productId;

// A colored label segment joined to a value segment. The web version carries the
// explanation in a `title` hover hint; there is no hover on a phone, so the hint
// rides along as an accessibility label rather than an interactive tooltip.
const SummaryChip = ({
  label,
  value,
  total,
  hint,
  labelClassName,
  labelTextClassName = "text-white",
  alert,
}) => (
  <View
    accessibilityLabel={`${label}: ${value} of ${total}. ${hint}`}
    className={cn(
      "min-w-[45%] grow flex-row items-stretch overflow-hidden rounded-xl border border-border bg-background",
      alert && "border-2 border-moaddi-warning",
    )}
  >
    <View
      className={cn("min-w-[68px] items-center justify-center px-3 py-2.5", labelClassName)}
    >
      <Text className={cn("text-xs font-extrabold uppercase", labelTextClassName)}>
        {label}
      </Text>
    </View>
    <View className="flex-1 flex-row items-center justify-center gap-1 px-3 py-2.5">
      <Text className="text-xl font-extrabold text-foreground">{value}</Text>
      <Text className="text-xs font-bold text-muted-foreground">/ {total}</Text>
    </View>
  </View>
);

const MachineSummary = ({ boxes, machine, selectedCount }) => {
  const list = Array.isArray(boxes) ? boxes : [];
  const counts = useMemo(
    () => ({
      // Green "Open" = ready to open, which per the legend means the box holds
      // product and the lock reads closed.
      open: list.filter((box) => isBoxFilled(box) && !box.status).length,
      close: list.filter((box) => !box.status).length,
      // Approximate: there is no per-lock health data (no heartbeat, and the
      // socket layer only carries LOCKER/IR), so this falls back to the
      // machine-level connection and is all-or-nothing. Per-box granularity
      // needs a lastSeen field plus a firmware heartbeat.
      out: machine?.isConnected ? 0 : list.length,
      fill: list.filter(isBoxFilled).length,
      selected: selectedCount ?? 0,
    }),
    [list, machine?.isConnected, selectedCount],
  );

  const total = list.length;

  return (
    <View className="mt-5 border-t border-border pt-4">
      <View className="mb-3 flex-row items-center gap-2">
        <View className="h-4 w-1 rounded-full bg-primary" />
        <Text className="text-sm font-extrabold uppercase text-foreground">Summary</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <SummaryChip
          label="Open"
          value={counts.open}
          total={total}
          hint="Locks active and ready to open — stocked with product and currently closed."
          labelClassName="bg-moaddi-success"
        />
        <SummaryChip
          label="Close"
          value={counts.close}
          total={total}
          hint="Locks currently closed. Every ready-to-open lock is also closed, so Open never exceeds Close."
          labelClassName="bg-moaddi-danger"
        />
        <SummaryChip
          label="Out"
          value={counts.out}
          total={total}
          alert={counts.out > 0}
          hint="Locks with no communication with the website. Machine-level only for now, so this is 0 or every box."
          labelClassName="bg-moaddi-warning"
        />
        <SummaryChip
          label="Fill"
          value={counts.fill}
          total={total}
          hint="Locks that have product inside."
          labelClassName="bg-moaddi-info"
        />
        <SummaryChip
          label="Selected"
          value={counts.selected}
          total={total}
          hint="Locks you have ticked in the list below."
          labelClassName="bg-muted"
          labelTextClassName="text-muted-foreground"
        />
      </View>
    </View>
  );
};

export default MachineSummary;
