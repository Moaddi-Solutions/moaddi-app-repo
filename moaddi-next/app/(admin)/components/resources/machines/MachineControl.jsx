import { useSocket } from "@/(root)/context/Socket";
import { Button } from "@/../components/ui/button";
import { Card, CardContent } from "@/../components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/../components/ui/tooltip";
import { putRequest } from "@/../services/events";
import {
  boxesConvert,
  boxSerialDecoder,
  compressBoxData,
} from "@/../services/functions";
import {
  baseUrl,
  boxUpdateAPI,
  unassignBoxAPI,
} from "@/../services/serverAddresses";
import { cn } from "@/../lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  CircleOff,
  Lightbulb,
  Lock,
  Plus,
  Power,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ListBase,
  RecordContextProvider,
  useGetOne,
  useListContext,
  useRecordContext,
} from "ra-core";
import QRCode from "react-qr-code";

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

const BoxGrid = ({
  machine,
  boxes,
  refetchBoxes,
  selectedBoxes,
  setSelectedBoxes,
  selectedProduct,
  readyToSet,
  loading,
  setLoading,
}) => {
  const { isPending, data, refetch, dataUpdatedAt } = useGetOne("vendors", {
    id: machine.vendorId,
  });
  const {
    publishData,
    controlDirectMachine,
    controlBluetooth1Machine,
  } = useSocket();

  useEffect(() => {
    refetchBoxes.current = refetch;
    if (isPending) boxes.current = [];
    else {
      const _machine = data.machines.find(({ _id }) => _id == machine._id);
      boxes.current = _machine ? _machine.boxes : [];
    }
  }, [isPending, data, dataUpdatedAt, refetch]);

  useEffect(() => {
    if (loading) return;
    setSelectedBoxes([]);
  }, [loading]);

  const productAssignOne = (boxId) => {
    setLoading(true);
    BoxApi.productAssign(machine._id, [boxId], selectedProduct).then(() =>
      refetchBoxes
        .current?.()
        .then(() => setTimeout(() => setLoading(false), 100)),
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
      {boxes.current.map?.((box, i) => {
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
      <RealTime machine={machine} />
    </div>
  );
};

const RealTime = ({ machine }) => {
  const { machineEvents } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!machineEvents) return;
    queryClient.setQueriesData(
      {
        queryKey: ["vendors", "getOne", { id: machine.vendorId }],
      },
      (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          machines: prev.machines.map((item) => {
            if (item._id !== machine._id) return item;
            return {
              ...item,
              boxes: boxUpdateHandler(item.boxes, machineEvents, "status"),
            };
          }),
        };
      },
    );
  }, [machineEvents, machine, queryClient]);

  return null;
};

const boxUpdateHandler = (boxes, machineEvents, statusName) => {
  machineEvents?.boxes?.map((box) => {
    if (box === "all") {
      boxes = boxes.map((box) => {
        if (machineEvents.type === "IR") box.isFilled = !!machineEvents.value;
        else if (machineEvents.type === "LOCKER")
          box[statusName] = !!machineEvents.value;
        return box;
      });
    } else {
      boxSerialDecoder(
        machineEvents.machineId,
        box,
        machineEvents.machineType,
      ).map((cBox) => {
        boxes = boxes.map((oldBox) => {
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
  return boxes;
};

const MachineControl = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { publishData, controlDirectMachine, controlBluetooth1Machine } =
    useSocket();
  const boxes = useRef([]);
  const refetchBoxes = useRef(null);
  const machine = useRecordContext();
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
    refetchBoxes,
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
      boxes.current.map(({ _id }) => _id),
      selectedProduct,
    ).then(() => {
      refetchBoxes
        .current?.()
        .then(() => setTimeout(() => setLoading(false), 100));
    });
  };

  const productAssignSelected = () => {
    setLoading(true);
    BoxApi.productAssign(machine.id, selectedBoxes, selectedProduct).then(() => {
      refetchBoxes
        .current?.()
        .then(() => setTimeout(() => setLoading(false), 100));
    });
  };

  const productUnassignAll = (machineId) => {
    setLoading(true);
    BoxApi.productUnassign(machineId).then(() => {
      refetchBoxes
        .current?.()
        .then(() => setTimeout(() => setLoading(false), 100));
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
                        boxes.current.find(({ _id }) => id == _id),
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
                >
                  <ProductRow {...productRow} />
                </ListBase>
              </div>
            </div>
            <div className="border-t border-border/60 pt-4">
              <SectionHeading>Boxes / Slots</SectionHeading>
              <BoxGrid {...boxGrid} />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default MachineControl;
