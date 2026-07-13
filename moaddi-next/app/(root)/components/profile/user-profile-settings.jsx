"use client";

import { Icons } from "@/(root)/components/Icons";
import { useCart } from "@/(root)/context/cart-provider";
import { useDataProvider } from "@/(root)/context/ra/DataProviderContext";
import { Avatar, AvatarFallback } from "@/../components/ui/avatar";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/../components/ui/card";
import { Input } from "@/../components/ui/input";
import { Label } from "@/../components/ui/label";
import { Separator } from "@/../components/ui/separator";
import { Eye, EyeOff, Phone, Save, Shield, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function UserProfileSettings() {
  const t = useTranslations("Profile");
  const dataProvider = useDataProvider();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(0);
  const { user, setUser } = useCart();
  const [userInfo, setUserInfo] = useState({
    name: "",
    phone: "",
    newPassword: "",
    confirmPassword: "",
  });
  useEffect(() => {
    if (user)
      setUserInfo((prev) => ({
        ...prev,
        name: user.name,
        phone: user._id,
      }));
  }, [user]);

  const handleInputChange = (field, value) => {
    setUserInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (userInfo.newPassword !== userInfo.confirmPassword) {
      setUserInfo((prev) => ({
        ...prev,
        newPassword: "",
        confirmPassword: "",
      }));
      return toast.error(t("passwordsDoNotMatch"));
    }
    if (userInfo.newPassword && userInfo.newPassword.length < 6) {
      return toast.error(t("passwordTooShort"));
    }

    dataProvider
      .update("customers", {
        id: user._id,
        data: {
          ...(userInfo.name && { name: userInfo.name }),
          ...(userInfo.newPassword && { password: userInfo.newPassword }),
        },
      })
      .then(({ data }) => {
        setIsLoading(0);
        setIsEditing(false);
        setUser((prev) => (prev ? { ...prev, ...data } : prev));
        setUserInfo((prev) => ({
          ...prev,
          newPassword: "",
          confirmPassword: "",
        }));
        toast.success(t("profileUpdated"));
      })
      .catch((err) => {
        setIsLoading(0);
        setIsEditing(false);
        toast.error(err.message || t("profileUpdateFailed"));
      });
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black leading-tight text-pretty sm:text-4xl">
          {t("accountSettings")}
        </h1>
        <p className="text-muted-foreground text-sm font-semibold">
          {t("accountSettingsDescription")}
        </p>
      </div>

      {/* Profile Information */}
      <Card className="rounded-xl border-border/80 bg-card" size="sm">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="bg-primary size-14 shrink-0 border border-primary/20">
            <AvatarFallback className="bg-primary text-primary-foreground text-base font-black">
              {getInitials(userInfo.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="truncate text-lg font-black">{userInfo.name || "â€”"}</p>
            <Badge
              variant="outline"
              className="w-fit border-green-200 bg-green-50 font-bold text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
            >
              <span className="size-1.5 rounded-full bg-green-600" />
              {t("verifiedAccount")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="rounded-xl border-border/80 bg-card" size="sm">
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardDescription className="text-primary-text flex items-center gap-1.5 font-black tracking-[0.04em] uppercase">
              <User className="size-3.5" />
              {t("personalInformation")}
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant={isEditing ? "default" : "outline"}
            className="font-bold"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? t("cancel") : t("edit")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="font-bold">
              {t("name")}
            </Label>
            <Input
              id="name"
              value={userInfo.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={!isEditing}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5 font-bold">
              <Phone className="size-3.5" />
              {t("phoneNumber")}
            </Label>
            <Input id="phone" value={userInfo.phone} disabled className="h-10" />
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-1">
              <Button
                disabled={isLoading === 1}
                onClick={() => {
                  setIsLoading(1);
                  handleSave();
                }}
                className="font-bold"
              >
                {isLoading === 1 ? (
                  <Icons.spinner className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t("saveChanges")}
              </Button>
              <Button
                variant="outline"
                className="font-bold"
                onClick={() => setIsEditing(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="rounded-xl border-border/80 bg-card" size="sm">
        <CardHeader>
          <CardDescription className="text-primary-text flex items-center gap-1.5 font-black tracking-[0.04em] uppercase">
            <Shield className="size-3.5" />
            {t("security")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-black">{t("changePassword")}</p>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="font-bold">
              {t("newPassword")}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={userInfo.newPassword}
                onChange={(e) => handleInputChange("newPassword", e.target.value)}
                placeholder={t("enterNewPassword")}
                className="h-10 pe-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute inset-e-1 top-1"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="font-bold">
              {t("confirmNewPassword")}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={userInfo.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                placeholder={t("confirmNewPasswordPlaceholder")}
                className="h-10 pe-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute inset-e-1 top-1"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <Button
            disabled={isLoading === 2}
            onClick={() => {
              setIsLoading(2);
              handleSave();
            }}
            className="w-full font-bold md:w-auto"
          >
            {isLoading === 2 ? (
              <Icons.spinner className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t("updatePassword")}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

function getInitials(name) {
  if (typeof name !== "string" || !name.trim()) return "MC";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.[0]?.toUpperCase())
    .join("");
}
