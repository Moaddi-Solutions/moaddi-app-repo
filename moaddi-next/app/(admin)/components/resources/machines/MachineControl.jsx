import { useSocket } from "@/(root)/context/Socket";
import { Button } from "@/../components/ui/button";
import { Card, CardContent } from "@/../components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/../components/ui/tooltip";
import { getRequest, putRequest } from "@/../services/events";
import {
  boxesConvert,
  boxSerialDecoder,
  compressBoxData,
} from "@/../services/functions";
import {
  baseUrl,
  boxesByMachineAPI,
  boxUpdateAPI,
  unassignBoxAPI,
} from "@/../services/serverAddresses";
import { cn } from "@/../lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleOff,
  Lightbulb,
  Lock,
  Plus,
  Power,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ListBase,
  RecordContextProvider,
  useListContext,
  useRecordContext,
} from "ra-core";
import QRCode from "react-qr-code";

/** Machine docs store `boxes` as a capacity Number; slot rows are a separate list. */
const asBoxList = (value) => (Array.isArray(value) ? value : []);

const BoxApi = {
  productAssign: (machineId, boxIds, product) =>
    putRequest(boxUpdateAPI(product), {
      machineId,
      boxIds,
    }),
  productUnassign: (machineId) => putRequest(unassignBoxAPI(machineId)),
};

const ProductRow = ({
  selectedProduct,
  setSelectedProduct,
  readyToSet,
  loading,
}) => {
  const { data } = useListContext();
  return (
    <div className="flex w-full gap-3 overflow-x-auto p-1">
      {data?.map((product) => {
        const disabled = !(!loading && readyToSet && product.isActive);
        return (
          <RecordContextProvider key={product.id} value={product}>
            <button
              type="button"
              onClick={() => setSelectedProduct(product.id)}
              disabled={disabled}
              className={cn(
                "relative flex w-48 shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-3 text-start shadow-sm transition hover:border-primary/50",
                product.id === selectedProduct && "border-primary bg-(--primary)/6 ring-2 ring-primary/25",
                disabled && "pointer-events-none opacity-30",
              )}
            >
              {!product.isActive ? (
                <Lock className="absolute start-2 top-2 size-4 text-muted-foreground" />
              ) : null}
              <p className="truncate text-center text-sm font-bold text-foreground">{product.name}</p>
              {product.image?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image.src}
                  alt=""
                  className="mx-auto h-28 max-w-full object-contain"
                />
              ) : (
                <div className="h-28" />
              )}
              <p className="text-center text-lg font-extrabold text-foreground">
                {product.campaignPrice ?? product.salePrice} SAR
              </p>
            </button>
          </RecordContextProvider>
        );
      })}
    </div>
  );
};

const ButtonRow = ({ disabled, children, className }) => (
  <div
    className={cn(
      "flex w-full overflow-hidden rounded-xl border border-border bg-background",
      disabled && "pointer-events-none opacity-50",
      className,
    )}
  >
    {children}
  </div>
);

const RowButton = ({ children, disabled, variant = "ghost", className, ...props }) => (
  <Button
    type="button"
    variant={variant}
    disabled={disabled}
    className={cn("h-10 flex-1 rounded-none font-bold", className)}
    {...props}
  >
    {children}
  </Button>
);

const SectionHeading = ({ children }) => (
  <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.06em] text-foreground">
    <span className="h-4 w-1 rounded-full bg-primary" />
    {children}
  </h3>
);

// Lock summary chips — a colored label segment joined to a value segment, per the
// machine admin spec. `status` is the locker state: true means the lock is OPEN
// (see the boxes model), so a closed lock is `!status`.
const SummaryChip = ({ label, value, total, hint, className, alert }) => (
  <div
    title={hint}
    className={cn(
      "flex items-stretch overflow-hidden rounded-xl border border-border bg-background shadow-sm",
      alert && "ring-2 ring-warning",
    )}
  >
    <span
      className={cn(
        "flex min-w-19 items-center justify-center px-3 py-2.5 text-xs font-extrabold uppercase tracking-[0.06em]",
        className,
      )}
    >
      {label}
    </span>
    <span className="flex flex-1 items-baseline justify-center gap-1 px-3 py-2.5">
      <span className="text-xl font-extrabold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs font-bold tabular-nums text-muted-foreground">
        / {total}
      </span>
    </span>
  </div>
);

// Spec: "Fill — how many locks have product inside it". Assigning a product goes
// through fillProductInBox, which sets productId but never isFilled; isFilled only
// flips on an IR sensor event. Counting isFilled alone therefore reads 0 on a fully
// stocked machine whose IR path isn't reporting, so a box counts as filled when
// either source says it holds product.
const isBoxFilled = (box) => box.isFilled || !!box.productId;

const MachineSummary = ({ boxes, machine, selectedCount }) => {
  const slots = asBoxList(boxes);
  const counts = useMemo(
    () => ({
      // Spec: green "Open" = ready to open, which per the legend means the box
      // holds product and the lock reads closed.
      open: slots.filter((box) => isBoxFilled(box) && !box.status).length,
      close: slots.filter((box) => !box.status).length,
      // Approximate: there is no per-lock health data (no heartbeat, and the
      // socket layer only carries LOCKER/IR), so this falls back to the
      // machine-level connection and is all-or-nothing. Per-box granularity
      // needs a lastSeen field plus a firmware heartbeat.
      out: machine?.isConnected ? 0 : slots.length,
      fill: slots.filter(isBoxFilled).length,
      selected: selectedCount,
    }),
    [slots, machine?.isConnected, selectedCount],
  );

  const total = slots.length;

  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <SectionHeading>Summary</SectionHeading>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryChip
          label="Open"
          value={counts.open}
          total={total}
          hint="Locks active and ready to open — stocked with product and currently closed. A lock that is already open is not counted."
          className="bg-success text-success-foreground"
        />
        <SummaryChip
          label="Close"
          value={counts.close}
          total={total}
          hint="Locks currently closed. Every ready-to-open lock is also closed, so Open never exceeds Close."
          className="bg-destructive text-destructive-foreground"
        />
        <SummaryChip
          label="Out"
          value={counts.out}
          total={total}
          alert={counts.out > 0}
          hint="Locks with no communication with the website. Machine-level only for now, so this is 0 or every box."
          className="bg-warning text-warning-foreground"
        />
        <SummaryChip
          label="Fill"
          value={counts.fill}
          total={total}
          hint="Locks that have product inside."
          className="bg-info text-info-foreground"
        />
        <SummaryChip
          label="Selected"
          value={counts.selected}
          total={total}
          hint="Locks you have ticked in the grid above."
          className="bg-muted text-muted-foreground"
        />
      </div>
    </div>
  );
};

const BoxGrid = ({
  machine,
  boxes,
  refetch,
  selectedBoxes,
  setSelectedBoxes,
  selectedProduct,
  readyToSet,
  loading,
  setLoading,
}) => {
  const {
    publishData,
    controlDirectMachine,
    controlBluetooth1Machine,
  } = useSocket();

  useEffect(() => {
    if (loading) return;
    setSelectedBoxes([]);
  }, [loading]);

  const productAssignOne = (boxId) => {
    setLoading(true);
    BoxApi.productAssign(machine._id, [boxId], selectedProduct).then(() =>
      refetch().then(() => setTimeout(() => setLoading(false), 100)),
    );
  };

  const changeStatus = (machineId, cabinNumber, boxNumber, status) => {
    switch (machine.type) {
      case 0:
        controlDirectMachine({
          machineId,
          type: "LOCKER",
          value: status,
          boxes: [`${cabinNumber}_${boxNumber}`],
        });
        break;
      case 1:
        publishData({
          machineId,
          type: "LOCKER",
          value: 1,
          boxes: compressBoxData([{ cabinNumber, boxNumbers: [boxNumber] }]),
        });
        break;
      case 2:
        controlBluetooth1Machine({
          machineId,
          box: [cabinNumber, boxNumber],
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {boxes.map((box, i) => {
        const selected = selectedBoxes.includes(box._id);
        return (
        <RecordContextProvider key={box._id} value={box}>
          <Card
            className={cn(
              "border border-border bg-card shadow-sm transition-colors",
              selected && "border-primary bg-(--primary)/6 ring-1 ring-primary",
            )}
          >
            <CardContent className="flex flex-col items-center gap-3 p-3">
              <div className="flex w-full items-center justify-between gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-extrabold text-muted-foreground">
                  {i + 1}
                </span>
                <p className="truncate text-sm font-extrabold text-foreground">{box.name}</p>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    setSelectedBoxes((prev) =>
                      event.target.checked
                        ? [...prev, box._id]
                        : prev.filter((_id) => _id != box._id),
                    );
                  }}
                  className="size-4 accent-primary"
                />
              </div>

              {loading ? (
                <Button type="button" variant="ghost" size="icon-lg" disabled className="my-11">
                  <RefreshCw className="size-10 animate-spin" />
                </Button>
              ) : box.product ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${baseUrl()}${box.product.image}`}
                    alt=""
                    className="h-30.5 w-full object-contain px-2"
                  />
                  <p className="text-center text-sm font-semibold text-foreground">
                    {`${box.product.name} - ${box.product.campaignPrice ?? box.product.salePrice} SAR`}
                  </p>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  disabled={!(readyToSet && selectedProduct)}
                  onClick={() => productAssignOne(box._id)}
                  className="my-11"
                >
                  <Plus className="size-10" />
                </Button>
              )}

              {machine.type === 0 ? (
                <ButtonRow>
                  <RowButton
                    disabled={!(readyToSet && !box.status)}
                    variant={!box.status && box.productId ? "default" : "outline"}
                    onClick={() =>
                      changeStatus(machine._id, box.cabinNumber, box.boxNumber, 1)
                    }
                  >
                    Open
                  </RowButton>
                  <RowButton
                    disabled={!(readyToSet && box.status)}
                    variant={!box.status && box.productId ? "default" : "outline"}
                    onClick={() =>
                      changeStatus(machine._id, box.cabinNumber, box.boxNumber, 0)
                    }
                  >
                    Close
                  </RowButton>
                </ButtonRow>
              ) : null}

              {machine.type === 1 ? (
                <TooltipProvider>
                  <ButtonRow>
                    <RowButton
                      disabled={!(readyToSet && !box.status && box.productId)}
                      variant={!box.status && box.productId ? "default" : "outline"}
                      onClick={() =>
                        changeStatus(machine._id, box.cabinNumber, box.boxNumber, 1)
                      }
                    >
                      Open
                    </RowButton>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <RowButton disabled>
                          <Lightbulb className={cn(box.isFilled && "text-primary-text")} />
                        </RowButton>
                      </TooltipTrigger>
                      <TooltipContent>Fill</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <RowButton disabled>
                          <CircleOff className={cn(!box.status && "text-destructive")} />
                        </RowButton>
                      </TooltipTrigger>
                      <TooltipContent>Close</TooltipContent>
                    </Tooltip>
                  </ButtonRow>
                </TooltipProvider>
              ) : null}

              {machine.type === 2 ? (
                <ButtonRow>
                  <RowButton
                    disabled={!(readyToSet && !box.status)}
                    onClick={() =>
                      changeStatus(machine._id, box.cabinNumber, box.boxNumber, 1)
                    }
                  >
                    Open
                  </RowButton>
                </ButtonRow>
              ) : null}
            </CardContent>
          </Card>
        </RecordContextProvider>
        );
      })}
      <RealTime machineId={machine?.id ?? machine?._id} />
    </div>
  );
};

const RealTime = ({ machineId }) => {
  const { machineEvents } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!machineEvents || !machineId) return;
    // Patch the boxes-by-machine cache used by Fill (not machines.getOne —
    // that field is the capacity Number on list/show payloads).
    queryClient.setQueriesData(
      { queryKey: ["boxes", "byMachine", String(machineId)] },
      (prev) => boxUpdateHandler(asBoxList(prev), machineEvents, "status"),
    );
  }, [machineEvents, machineId, queryClient]);

  return null;
};

const boxUpdateHandler = (boxes, machineEvents, statusName) => {
  let next = asBoxList(boxes);
  machineEvents?.boxes?.map((box) => {
    if (box === "all") {
      next = next.map((slot) => {
        if (machineEvents.type === "IR") slot.isFilled = !!machineEvents.value;
        else if (machineEvents.type === "LOCKER")
          slot[statusName] = !!machineEvents.value;
        return slot;
      });
    } else {
      boxSerialDecoder(
        machineEvents.machineId,
        box,
        machineEvents.machineType,
      ).map((cBox) => {
        next = next.map((oldBox) => {
          if (cBox === oldBox._id) {
            if (machineEvents.type === "IR")
              oldBox.isFilled = !!machineEvents.value;
            else if (machineEvents.type === "LOCKER")
              oldBox[statusName] = !!machineEvents.value;
          }
          return oldBox;
        });
      });
    }
  });
  return next;
};

const MachineControl = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { publishData, controlDirectMachine, controlBluetooth1Machine } =
    useSocket();
  const machine = useRecordContext();
  const machineId = machine?.id ?? machine?._id;
  // Slot rows come from GET /boxes/machine/:id — machine.boxes on the machine
  // document is the capacity Number (list/show), not the slots array.
  const { data: boxesPayload, isPending, refetch } = useQuery({
    queryKey: ["boxes", "byMachine", String(machineId ?? "")],
    queryFn: () => getRequest(boxesByMachineAPI(machineId)),
    enabled: !!machineId,
  });
  const boxes = useMemo(() => {
    if (isPending) return [];
    return asBoxList(boxesPayload).filter((box) => !box.isDeleted);
  }, [boxesPayload, isPending]);
  const readyToSet = !machine?.isActive && machine?.isConnected;
  const productRow = {
    selectedProduct,
    setSelectedProduct,
    readyToSet,
    loading,
  };
  const boxGrid = {
    machine,
    selectedProduct,
    boxes,
    refetch,
    selectedBoxes,
    setSelectedBoxes,
    readyToSet,
    loading,
    setLoading,
  };

  const productAssignAll = () => {
    setLoading(true);
    BoxApi.productAssign(
      machine.id,
      boxes.map(({ _id }) => _id),
      selectedProduct,
    ).then(() => {
      refetch().then(() => setTimeout(() => setLoading(false), 100));
    });
  };

  const productAssignSelected = () => {
    setLoading(true);
    BoxApi.productAssign(machine.id, selectedBoxes, selectedProduct).then(() => {
      refetch().then(() => setTimeout(() => setLoading(false), 100));
    });
  };

  const productUnassignAll = (machineId) => {
    setLoading(true);
    BoxApi.productUnassign(machineId).then(() => {
      refetch().then(() => setTimeout(() => setLoading(false), 100));
    });
  };

  const openAll = (machineId) => {
    switch (machine.type) {
      case 0:
        controlDirectMachine({
          machineId,
          type: "LOCKER",
          value: 1,
          boxes: ["all"],
        });
        break;
      case 1:
        publishData({
          machineId,
          type: "LOCKER",
          value: 1,
          boxes: ["all"],
        });
        break;
      default:
        break;
    }
  };

  const openSelected = async (machineId, boxes) => {
    switch (machine.type) {
      case 0:
        for (const { cabinNumber, boxNumber } of boxes) {
          controlDirectMachine({
            machineId,
            type: "LOCKER",
            value: 1,
            boxes: [`${cabinNumber}_${boxNumber}`],
          });
          await new Promise((r) => setTimeout(r, 500));
        }
        break;
      case 1:
        publishData({
          machineId,
          type: "LOCKER",
          value: 1,
          boxes: boxesConvert(boxes),
        });
        break;
      case 2:
        for (const { cabinNumber, boxNumber } of boxes) {
          controlBluetooth1Machine({
            machineId,
            box: [cabinNumber, boxNumber],
          });
          await new Promise((r) => setTimeout(r, 500));
        }
        break;
      default:
        break;
    }
  };

  const reboot = () => {};

  if (!machine) return null;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="h-50 w-50 rounded-xl border-8 border-white bg-white p-2 ring-1 ring-border">
              <QRCode value={machine.qrCode} className="h-full w-full" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Scan to connect
            </span>
          </div>
          {children}
          {!!machine.vendorId ? (
            <div className="flex w-full max-w-md flex-col gap-2">
              {machine.type == 2 ? (
                <ButtonRow disabled={!(!loading && readyToSet)}>
                  <RowButton variant="outline" onClick={reboot}>
                    <Power className="me-1 size-4" />
                    Reboot machine
                  </RowButton>
                </ButtonRow>
              ) : null}
              <ButtonRow disabled={!(!loading && readyToSet)}>
                {machine.type != 3 ? (
                  <RowButton variant="outline" disabled>
                    Box open
                  </RowButton>
                ) : null}
                {machine.type != 2 ? (
                  <RowButton onClick={() => openAll(machine._id)}>All</RowButton>
                ) : null}
                <RowButton
                  onClick={() =>
                    openSelected(
                      machine._id,
                      selectedBoxes.map((id) =>
                        boxes.find(({ _id }) => id == _id),
                      ),
                    )
                  }
                  disabled={!selectedBoxes.length}
                >
                  Selected {selectedBoxes.length ? `(${selectedBoxes.length})` : ""}
                </RowButton>
              </ButtonRow>
              <ButtonRow disabled={!(!loading && readyToSet && selectedProduct)}>
                <RowButton variant="outline" disabled>
                  Add product
                </RowButton>
                <RowButton onClick={productAssignAll}>All</RowButton>
                <RowButton
                  disabled={!selectedBoxes.length}
                  onClick={productAssignSelected}
                >
                  Selected {selectedBoxes.length ? `(${selectedBoxes.length})` : ""}
                </RowButton>
              </ButtonRow>
              <ButtonRow disabled={!(!loading && readyToSet)}>
                <RowButton variant="outline" disabled>
                  Remove product
                </RowButton>
                <RowButton
                  className="text-destructive hover:text-destructive"
                  onClick={() => productUnassignAll(machine.id)}
                >
                  All
                </RowButton>
              </ButtonRow>
            </div>
          ) : null}
        </div>
        {!!machine.vendorId ? (
          <>
            <div className="border-t border-border/60 pt-4">
              <SectionHeading>Products</SectionHeading>
              <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-muted/20 p-2">
                <ListBase
                  resource="products"
                  sort={{ field: "name", order: "DESC" }}
                  perPage={100}
                  filter={
                    machine.vendorId ? { vendorId: machine.vendorId } : undefined
                  }
                  // Fill staff lack Product manage rights; requireAccess on
                  // this nested list would send them to /access-denied.
                  disableAuthentication
                >
                  <ProductRow {...productRow} />
                </ListBase>
              </div>
            </div>
            <div className="border-t border-border/60 pt-4">
              <SectionHeading>Boxes / Slots</SectionHeading>
              <BoxGrid {...boxGrid} />
              <MachineSummary
                boxes={boxes}
                machine={machine}
                selectedCount={selectedBoxes.length}
              />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default MachineControl;
