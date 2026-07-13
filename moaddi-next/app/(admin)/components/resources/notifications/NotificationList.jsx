import { useSocket } from "@/(root)/context/Socket";
import AdminList from "@/(admin)/components/kit/AdminList";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import { Card, CardContent } from "@/../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/../components/ui/table";
import { Fit } from "@/../services/data-provider";
import { Check, PackageOpen, Radio, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useListContext } from "ra-core";

const ListActions = () => <LiveIndicator />;

const LiveIndicator = () => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success-soft)] px-2.5 py-1 text-xs font-extrabold text-[color:var(--success)]">
    <Radio className="size-3 animate-pulse" aria-hidden="true" />
    Live
  </span>
);

const audio = new Audio(
  `${process.env.NEXT_PUBLIC_SITE_URL}/notification.webm`,
);

const SocketContextWontWorkInListWithoutWhy = ({ refetchRef }) => {
  const { notification, machineEvents } = useSocket();

  useEffect(() => {
    refetchRef.current?.();
  }, [notification, machineEvents, refetchRef]);

  useEffect(() => {
    if (typeof notification !== "boolean") return;
    audio.currentTime = 0;
    setTimeout(() => audio.play(), 100);
  }, [notification]);

  return null;
};

const NotificationTable = ({ refetchRef }) => {
  const { data = [], refetch, isPending } = useListContext();
  const { controlDirectMachine, customerRequestAccept } = useSocket();

  useEffect(() => {
    if (refetch) refetchRef.current = refetch;
  }, [refetch, refetchRef]);

  const rows = data.flatMap((record) =>
    (record.boxes ?? [])
      .map((box) => {
        const product = (record.products ?? []).find(
          ({ _id }) => _id === box.productId,
        );
        if (!product) return null;
        return {
          key: `${record.id ?? record._id}-${box._id}`,
          record,
          box,
          product,
        };
      })
      .filter(Boolean),
  );

  const approveHandler = async ({ record, box }) => {
    controlDirectMachine({
      machineId: record.machineId,
      type: "LOCKER",
      value: "1",
      boxes: [`${box.cabinNumber}_${box.boxNumber}`],
      purchaseId: record.id,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  const rejectHandler = ({ record }) => {
    customerRequestAccept({
      _id: record._id,
      status: "PaymentRejected",
    });
  };

  if (isPending) {
    return (
      <Card className="rounded-2xl border-0 bg-card font-sans shadow-none ring-1 ring-border/70" size="sm">
        <CardContent className="p-6 text-sm font-semibold text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card className="rounded-2xl border-0 bg-card font-sans shadow-none ring-1 ring-border/70" size="sm">
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <PackageOpen className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-1 text-sm font-bold text-foreground">All caught up</p>
          <p className="text-xs font-semibold text-muted-foreground">
            No pending dispense requests right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 font-sans md:hidden">
        {rows.map((row) => (
          <Card
            key={row.key}
            className="rounded-2xl border-0 bg-card shadow-none ring-1 ring-border/70"
            size="sm"
          >
            <CardContent className="grid gap-3 p-4">
              <ProductCell product={row.product} />
              <Info label="Customer" value={customerLabel(row.record)} />
              <Info label="Box" value={row.box.name} />
              <Info label="Machine" value={row.record.machineId} />
              <Info label="Price" value={productPrice(row.product)} />
              <ActionButtons
                onApprove={() => approveHandler(row)}
                onReject={() => rejectHandler(row)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl bg-card font-sans ring-1 ring-border/70 md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-0 border-b border-border/70 bg-muted/40 hover:bg-muted/40">
                <TableHead className="h-12 px-4 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  Product
                </TableHead>
                <TableHead className="h-12 px-4 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="h-12 px-4 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  Box
                </TableHead>
                <TableHead className="h-12 px-4 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  Machine
                </TableHead>
                <TableHead className="h-12 px-4 text-end text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  Price
                </TableHead>
                <TableHead className="h-12 px-4 text-end text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.key}
                  className="border-0 border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40"
                >
                  <TableCell className="px-4 py-3.5">
                    <ProductCell product={row.product} />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm font-semibold text-foreground">
                    {customerLabel(row.record)}
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Badge className="rounded-full border-0 bg-muted font-extrabold text-muted-foreground">
                      {row.box.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] px-4 py-3.5 text-sm font-semibold text-foreground">
                    <span className="break-all font-mono text-xs">{row.record.machineId}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-end text-sm font-extrabold tabular-nums text-foreground">
                    {productPrice(row.product)}
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <ActionButtons
                      align="end"
                      onApprove={() => approveHandler(row)}
                      onReject={() => rejectHandler(row)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

const NotificationList = () => {
  const refetchRef = useRef();
  return (
    <>
      <SocketContextWontWorkInListWithoutWhy refetchRef={refetchRef} />
      <AdminList actions={<ListActions />}>
        <NotificationTable refetchRef={refetchRef} />
      </AdminList>
    </>
  );
};

function ProductCell({ product }) {
  const image = Fit.image(product).image?.src;
  return (
    <div className="flex min-w-0 items-center gap-3">
      {image ? (
        <img
          src={image}
          alt=""
          className="size-11 shrink-0 rounded-xl border border-border/70 bg-muted/40 object-contain"
        />
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <PackageOpen className="size-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-foreground">{product.name}</p>
        <p className="truncate font-mono text-xs font-medium text-muted-foreground">
          {product._id}
        </p>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-foreground">{value ?? "-"}</p>
    </div>
  );
}

function ActionButtons({ align = "start", onApprove, onReject }) {
  return (
    <div className={`flex flex-wrap gap-2 ${align === "end" ? "justify-end" : ""}`}>
      <Button
        type="button"
        size="sm"
        className="gap-2 rounded-full bg-[color:var(--success)] font-extrabold text-[color:var(--success-foreground)] hover:brightness-95"
        onClick={onApprove}
      >
        <Check className="size-4" />
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="gap-2 rounded-full font-extrabold"
        onClick={onReject}
      >
        <X className="size-4" />
        Reject
      </Button>
    </div>
  );
}

function customerLabel(record) {
  return record?.customer?.[0]?.name ?? record?.customer?.[0]?._id ?? "-";
}

function productPrice(product) {
  return `${product.campaignPrice ?? product.salePrice} SAR`;
}

export default NotificationList;
