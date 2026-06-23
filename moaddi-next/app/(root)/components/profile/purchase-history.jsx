"use client";

import { useCart } from "@/(root)/context/cart-provider";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import { formatProductPrice } from "@/../constants/currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/../components/ui/table";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Sample purchase data
const x = [
  {
    id: "ORD-001",
    date: "2024-01-15",
    items: "MacBook Pro 14-inch, Magic Mouse",
    quantity: 2,
    total: 2299.0,
    status: "delivered",
    paymentMethod: "Credit Card",
  },
  {
    id: "ORD-002",
    date: "2024-01-08",
    items: "iPhone 15 Pro, AirPods Pro",
    quantity: 2,
    total: 1398.0,
    status: "delivered",
    paymentMethod: "PayPal",
  },
  {
    id: "ORD-003",
    date: "2024-01-02",
    items: "iPad Air, Apple Pencil",
    quantity: 2,
    total: 729.0,
    status: "shipped",
    paymentMethod: "Credit Card",
  },
  {
    id: "ORD-004",
    date: "2023-12-28",
    items: "Apple Watch Series 9",
    quantity: 1,
    total: 399.0,
    status: "processing",
    paymentMethod: "Apple Pay",
  },
  {
    id: "ORD-005",
    date: "2023-12-20",
    items: "AirTag 4-pack, MagSafe Charger",
    quantity: 2,
    total: 138.0,
    status: "delivered",
    paymentMethod: "Credit Card",
  },
  {
    id: "ORD-006",
    date: "2023-12-15",
    items: "HomePod mini",
    quantity: 1,
    total: 99.0,
    status: "cancelled",
    paymentMethod: "Credit Card",
  },
];

const getStatusBadge = (status) => {
  switch (status) {
    case "Completed":
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 hover:bg-green-100"
        >
          Completed
        </Badge>
      );
    case "PaymentDoneRequest":
      return (
        <Badge
          variant="default"
          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
        >
          Initiate
        </Badge>
      );
    case "PaymentDone":
      return (
        <Badge
          variant="default"
          className="bg-blue-100 text-blue-800 hover:bg-blue-100"
        >
          Payment Done
        </Badge>
      );
    // case "cancelled":
    //   return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const PurchaseHistoryData = ({ id, preferredCurrency = "SAR" }) => {
  const [totalSpent, setTotalSpent] = useState();
  const { isPending, data, total } = useGetManyReference("purchases", {
    id,
    target: "customerId",
    pagination: { page: 1, perPage: 100 },
    // sort: { field: "date", order: "DESC" },
    // filter: {},
  });
  useEffect(() => {
    if (!data) return;
    setTotalSpent(
      data
        .reduce((sum, purchase) => parseFloat(purchase.price) + sum, 0)
        .toFixed(2),
    );
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              Purchase History
            </CardTitle>
            <CardDescription>
              View and manage your order history and purchase details
            </CardDescription>
          </div>
          {/* <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search orders..." className="pl-8 w-full sm:w-[250px]" />
              </div>
            </div> */}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {/* <TableHead className="w-[120px]">Order ID</TableHead> */}
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead className="hidden sm:table-cell">Qty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                {/* <TableHead className="hidden lg:table-cell">Payment</TableHead> */}
                <TableHead className="px-4 text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {!isPending && (
              <TableBody>
                {data.map(
                  ({
                    _id,
                    products,
                    items,
                    created,
                    price,
                    status,
                    invoiceId,
                  }) => {
                    const productsString = products
                      .map(({ name }) => name)
                      .join(", ");
                    return (
                      <TableRow key={_id}>
                        {/* {
                        machineId: "machine_D8132A006674",
                        items: [
                          {
                            productId: "product_J_k8MYj5d",
                            boxId: "machine_D8132A006674_C1_5",
                            boxStatus: false,
                          },
                        ],
                        price: 40,
                        created: "2025-07-25T16:19:30.958Z",
                        status: "PaymentDoneRequest",
                        products: [
                          {
                            _id: "product_J_k8MYj5d",
                            name: "Nescafe Coffee",
                            barCode: "105",
                            isActive: true,
                            isDeleted: false,
                            created: "2023-07-27T04:22:34.163Z",
                            image: "images/1750579773444_Pasted image (3).png",
                            updated: "2025-06-26T17:25:12.673Z",
                            originalPrice: 1,
                            tax: 14,
                            campaignPrice: 40,
                            salePrice: 50,
                          },
                        ],
                      } */}
                        {/* <TableCell className="font-medium">{_id}</TableCell> */}
                        <TableCell>
                          {new Date(created).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] md:table-cell">
                          <div className="truncate" title={productsString}>
                            {productsString}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {items.length}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatProductPrice(price, preferredCurrency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        {/* <TableCell className="text-muted-foreground hidden lg:table-cell">
                        {purchase.paymentMethod}
                      </TableCell> */}
                        <TableCell className=" text-end">
                          <Link
                            href={`/invoice/success?invoiceId=${encodeURIComponent(String(invoiceId ?? _id))}&show=1`}
                          >
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4 text-gray-700" />
                            </Button>
                          </Link>
                          {/* <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-700"
                          >
                            <Download className="h-4 w-4" />
                          </Button> */}
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
              </TableBody>
            )}
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-muted-foreground text-xs">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {totalSpent != null
                  ? formatProductPrice(totalSpent, preferredCurrency)
                  : null}
              </div>
              <p className="text-muted-foreground text-xs">Total Spent</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
export default function PurchaseHistory({ preferredCurrency }) {
  const { user } = useCart();
  const currency = preferredCurrency ?? user?.preferredCurrency ?? "SAR";
  return (
    user && <PurchaseHistoryData id={user._id} preferredCurrency={currency} />
  );
}
