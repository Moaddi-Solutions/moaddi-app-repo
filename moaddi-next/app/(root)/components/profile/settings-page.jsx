"use client";

import { Badge } from "@/../components/ui/badge";
import { formatProductPrice } from "@/../constants/currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import { useSearchParams } from "next/navigation";

import { useCart } from "@/(root)/context/cart-provider";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/../components/ui/tabs";
import { CreditCard, Package, Settings, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import PurchaseHistory from "./purchase-history";
import UserProfileSettings from "./user-profile-settings";

export default function SettingsPage({ preferredCurrency }) {
  const { user } = useCart();
  const currency = preferredCurrency ?? user?.preferredCurrency ?? "SAR";
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") ?? "overview",
  );
  const settingsCards = [
    {
      id: "profile",
      title: "Profile Settings",
      description: "Manage your personal information and account details",
      icon: User,
      badge: null,
      action: () => setActiveTab("profile"),
    },
    {
      id: "purchases",
      title: "Purchase History",
      description: "View your order history and track purchases",
      icon: ShoppingBag,
      badge: "6 Orders",
      action: () => setActiveTab("purchases"),
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-2"
      >
        <div className="mb-3 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          {/* <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger> */}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="pb-6">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Account Overview
              </CardTitle>
              <CardDescription>
                Quick access to your account settings and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {settingsCards.map((card) => {
                  const IconComponent = card.icon;
                  return (
                    <Card
                      onClick={card.action}
                      key={card.id}
                      className="cursor-pointer transition-shadow hover:shadow-md"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-1 items-start gap-3">
                            <div className="bg-primary/10 rounded-lg p-2">
                              <IconComponent className="text-primary h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-semibold">
                                {card.title}
                              </h3>
                              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                                {card.description}
                              </p>
                              {card.badge && (
                                <Badge
                                  variant="secondary"
                                  className="mt-2 text-xs"
                                >
                                  {card.badge}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {/* <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1"
                            onClick={card.action}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button> */}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          {/* Quick Stats */}
          {user && <QuickStats user={user} preferredCurrency={currency} />}
        </TabsContent>

        <TabsContent value="profile">
          <UserProfileSettings />
        </TabsContent>

        <TabsContent value="purchases">
          <PurchaseHistory preferredCurrency={currency} />
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your payment methods and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Payment methods management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Notification settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const QuickStats = ({ user, preferredCurrency = "SAR" }) => {
  const { isPending, data, total } = useGetManyReference("purchases", {
    id: user._id,
    target: "customerId",
    pagination: { page: 1, perPage: 100 },
  });
  const totalSpent = !isPending
    ? data
        .reduce((sum, purchase) => parseFloat(purchase.price) + sum, 0)
        .toFixed(2)
    : null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-muted-foreground text-xs">Total Orders</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {totalSpent != null
                  ? formatProductPrice(totalSpent, preferredCurrency)
                  : null}
              </div>
              <p className="text-muted-foreground text-xs">Total Spent</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
