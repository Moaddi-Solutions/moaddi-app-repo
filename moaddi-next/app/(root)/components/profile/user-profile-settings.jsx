"use client";

import { Icons } from "@/(root)/components/Icons";
import { useCart } from "@/(root)/context/cart-provider";
import { useDataProvider } from "@/(root)/context/ra/DataProviderContext";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import { Input } from "@/../components/ui/input";
import { Label } from "@/../components/ui/label";
import { Separator } from "@/../components/ui/separator";
import { Eye, EyeOff, Phone, Save, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function UserProfileSettings() {
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
      return toast.error("New password and confirm password do not match.");
    }
    if (userInfo.newPassword && userInfo.newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters long.");
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
        setUser((prev) => ({ ...prev, ...data }));
        setUserInfo((prev) => ({
          ...prev,
          newPassword: "",
          confirmPassword: "",
        }));
        toast.success("Profile updated successfully");
      })
      .catch((err) => {
        setIsLoading(0);
        setIsEditing(false);
        toast.error(err.message || "Failed to update profile");
      });
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and security settings
          </p>
        </div>

        {/* Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src="/placeholder.svg?height=96&width=96"
                    alt="Profile picture"
                  />
                  <AvatarFallback className="text-lg">
                    {userInfo.name
                      .split(" ")
                      .map((i) => i[0])
                      .join(" ")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div> */}
              <div className="space-y-2">
                <p className="text-lg font-semibold">{userInfo.name}</p>
                {/* <p className="text-muted-foreground text-sm">
                  {userInfo.email}
                </p> */}
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  Verified Account
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </div>
              <Button
                variant={isEditing ? "default" : "outline"}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={userInfo.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={!isEditing}
              />
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={userInfo.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={!isEditing}
              />
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={userInfo.phone}
                // onChange={(e) => handleInputChange("phone", e.target.value)}
                disabled
              />
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button
                  disabled={isLoading == 1}
                  onClick={() => (setIsLoading(1), handleSave())}
                  className="flex items-center gap-2"
                >
                  {isLoading == 1 ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Update your password and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword ? "text" : "password"}
                    value={userInfo.currentPassword}
                    onChange={(e) =>
                      handleInputChange("currentPassword", e.target.value)
                    }
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div> */}

              <Separator />

              <div className="space-y-4">
                <p className="text-lg font-medium">Change Password</p>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={userInfo.newPassword}
                      onChange={(e) =>
                        handleInputChange("newPassword", e.target.value)
                      }
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={userInfo.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                disabled={isLoading == 2}
                onClick={() => (setIsLoading(2), handleSave())}
                className="w-full md:w-auto"
              >
                {isLoading == 2 ? (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Update Password
              </Button>
            </div>

            {/* <Separator />

            <div className="space-y-4">
              <p className="font-medium">Two-Factor Authentication</p>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">SMS Authentication</p>
                  <p className="text-muted-foreground text-sm">
                    Receive codes via SMS
                  </p>
                </div>
                <Badge variant="outline">Not Enabled</Badge>
              </div>
              <Button variant="outline">
                Enable Two-Factor Authentication
              </Button>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
